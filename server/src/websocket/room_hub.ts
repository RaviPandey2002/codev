import { roomFiles, yjsSnapshots } from './../db/schema';
import * as Y from 'yjs';
import * as syncProtocol from 'y-protocols/sync';
import * as awarenessProtocol from 'y-protocols/awareness';
import * as encoding from 'lib0/encoding';
import * as decoding from 'lib0/decoding';
import { db } from '../db';
import { desc, eq } from 'drizzle-orm';
import type { WebSocket } from 'ws';
import { clearTimeout } from 'node:timers';

export const MESSAGE_SYNC = 0;
export const MESSAGE_AWARENESS = 1;

interface RoomSession {
  doc: Y.Doc;
  awareness: awarenessProtocol.Awareness;
  conns: Map<WebSocket, Set<number>>;
  saveTimeout: NodeJS.Timeout | null;
  evictionTimeout: NodeJS.Timeout | null;
  heartBeatInterval: NodeJS.Timeout | null;
}

interface HeartbeatWebSocket extends WebSocket {
  isAlive?: boolean;
}

class RoomHub {
  private rooms = new Map<string, RoomSession>();
  private loadingRooms = new Map<string, Promise<RoomSession>>();

  async getOrCreateRoomSession(roomId: string): Promise<RoomSession> {
    const existing = this.rooms.get(roomId);
    if (existing) return existing;

    const inFlight = this.loadingRooms.get(roomId);
    if (inFlight) return inFlight;

    const promise = this.initRoomSession(roomId).finally(() => {
      this.loadingRooms.delete(roomId);
    });
    this.loadingRooms.set(roomId, promise);
    return promise;
  }

  private async initRoomSession(roomId: string): Promise<RoomSession> {
    const doc = new Y.Doc();
    const awareness = new awarenessProtocol.Awareness(doc);

    const latestSnapshot = await db.query.yjsSnapshots.findFirst({
      where: eq(yjsSnapshots.roomId, roomId),
      orderBy: [desc(yjsSnapshots.updatedAt)],
    });

    if (latestSnapshot && latestSnapshot.snapshot) {
      Y.applyUpdate(doc, new Uint8Array(latestSnapshot.snapshot));
    } else {
      const file = await db.query.roomFiles.findFirst({
        where: eq(roomFiles.roomId, roomId),
      });

      if (file && file.content) {
        const yText = doc.getText('monaco');
        yText.insert(0, file.content);
      }
    }

    const room: RoomSession = {
      doc,
      awareness,
      conns: new Map(),
      saveTimeout: null,
      evictionTimeout: null,
      heartBeatInterval: null
    };

    this.rooms.set(roomId, room);

    // Broadcast incremental document updates to all peers and schedule snapshot persistence
    doc.on('update', (update: Uint8Array, origin: any) => {
      const encoder = encoding.createEncoder();
      encoding.writeVarUint(encoder, MESSAGE_SYNC);
      syncProtocol.writeUpdate(encoder, update);
      const message = encoding.toUint8Array(encoder);

      room.conns.forEach((_, conn) => {
        if (conn !== origin && conn.readyState === 1) {
          conn.send(message);
        }
      });

      this.scheduleSnapshotSave(roomId, room);
    });

    // Broadcast awareness (cursor / selection) updates to all peers in this room
    awareness.on(
      'update',
      (
        { added, updated, removed }: { added: number[]; updated: number[]; removed: number[] },
        origin: any
      ) => {
        if (origin && room.conns.has(origin)) {
          const controlled = room.conns.get(origin)!;
          added.forEach((id) => controlled.add(id));
          removed.forEach((id) => controlled.delete(id));
        }
        const changedClients = added.concat(updated, removed);
        const encoder = encoding.createEncoder();
        encoding.writeVarUint(encoder, MESSAGE_AWARENESS);
        encoding.writeVarUint8Array(
          encoder,
          awarenessProtocol.encodeAwarenessUpdate(awareness, changedClients)
        );
        const buff = encoding.toUint8Array(encoder);
        room.conns.forEach((_, c) => {
          if (c !== origin && c.readyState === 1) {
            c.send(buff);
          }
        });
      }
    );

    return room;
  }

  private processIncomingMessage(room: RoomSession, conn: WebSocket, data: Buffer) {
    try {
      const uint8Data = new Uint8Array(data);
      const decoder = decoding.createDecoder(uint8Data);
      const messageType = decoding.readVarUint(decoder);

      if (messageType === MESSAGE_SYNC) {
        const syncEncoder = encoding.createEncoder();
        encoding.writeVarUint(syncEncoder, MESSAGE_SYNC);
        syncProtocol.readSyncMessage(decoder, syncEncoder, room.doc, conn);
        if (encoding.length(syncEncoder) > 1 && conn.readyState === 1) {
          conn.send(encoding.toUint8Array(syncEncoder));
        }
      } else if (messageType === MESSAGE_AWARENESS) {
        awarenessProtocol.applyAwarenessUpdate(
          room.awareness,
          decoding.readVarUint8Array(decoder),
          conn
        );
      }
    } catch (err) {
      console.error('WebSocket message processing error:', err);
    }
  }

  async handleConnection(
    conn: WebSocket,
    roomId: string,
    _user: { id: string; username: string },
    earlyMessages: Buffer[] = [],
    onEarlyMessage?: (data: Buffer) => void
  ) {
    const room = await this.getOrCreateRoomSession(roomId);

    if (onEarlyMessage) {
      conn.off('message', onEarlyMessage);
    }

    if (conn.readyState !== 1) {
      return;
    }

    const controlledIds = new Set<number>();
    room.conns.set(conn, controlledIds);

    // cancel pending eviction - a peer reconnected within grace window
    if (room.evictionTimeout) {
      clearTimeout(room.evictionTimeout);
      room.evictionTimeout = null;
    }

    const hbConn = conn as HeartbeatWebSocket;
    hbConn.isAlive = true;

    conn.on("pong", () => {
      hbConn.isAlive = true;
    });

    if (!room.heartBeatInterval) {
      room.heartBeatInterval = setInterval(() => {

        room.conns.forEach((_, c) => {
          const socket = c as HeartbeatWebSocket;

          if (socket.isAlive === false) {
            // Did not respond to last ping -> hard terminate
            socket.terminate();
            return;
          }
          socket.isAlive = false;
          socket.ping();
        });

      }, 30_000)
    }

    // Attach permanent message listener before flushing early messages
    conn.on('message', (data: Buffer) => {
      this.processIncomingMessage(room, conn, data);
    });

    // Flush any messages that arrived while async DB checks were running
    for (const msg of earlyMessages) {
      this.processIncomingMessage(room, conn, msg);
    }

    // Send SyncStep1 + SyncStep2 so client is guaranteed to receive initial state and mark synced=true
    const step1Encoder = encoding.createEncoder();
    encoding.writeVarUint(step1Encoder, MESSAGE_SYNC);
    syncProtocol.writeSyncStep1(step1Encoder, room.doc);
    conn.send(encoding.toUint8Array(step1Encoder));

    const step2Encoder = encoding.createEncoder();
    encoding.writeVarUint(step2Encoder, MESSAGE_SYNC);
    syncProtocol.writeSyncStep2(step2Encoder, room.doc);
    conn.send(encoding.toUint8Array(step2Encoder));

    // Send current active peer cursors
    const awarenessStates = room.awareness.getStates();
    if (awarenessStates.size > 0) {
      const awarenessEncoder = encoding.createEncoder();
      encoding.writeVarUint(awarenessEncoder, MESSAGE_AWARENESS);
      encoding.writeVarUint8Array(
        awarenessEncoder,
        awarenessProtocol.encodeAwarenessUpdate(
          room.awareness,
          Array.from(awarenessStates.keys())
        )
      );
      conn.send(encoding.toUint8Array(awarenessEncoder));
    }

    conn.on('close', () => {
      const controlled = room.conns.get(conn);
      room.conns.delete(conn);
      if (controlled && controlled.size > 0) {
        awarenessProtocol.removeAwarenessStates(
          room.awareness,
          Array.from(controlled),
          null
        );
      }
      if (room.conns.size === 0) {

        // flush any pending debounce save events
        if (room.saveTimeout) {
          clearTimeout(room.saveTimeout);
          room.saveTimeout = null;
        }

        this.saveSnapshot(roomId, room);

        if (room.heartBeatInterval) {
          clearInterval(room.heartBeatInterval);
          room.heartBeatInterval = null;
        }

        room.evictionTimeout = setTimeout(() => {

          // double check if no one reconnected during this window
          if(room.conns.size > 0) return;

          room.doc.destroy();
          room.awareness.destroy();

          this.rooms.delete(roomId);

        }, 60_000);
      }
    });
  }

  private scheduleSnapshotSave(roomId: string, room: RoomSession) {
    if (room.saveTimeout) clearTimeout(room.saveTimeout);
    room.saveTimeout = setTimeout(() => {
      this.saveSnapshot(roomId, room);
    }, 5000);
  }

  private async saveSnapshot(roomId: string, room: RoomSession) {
    try {
      const stateUpdate = Y.encodeStateAsUpdate(room.doc);
      await db
        .insert(yjsSnapshots)
        .values({
          roomId,
          snapshot: Buffer.from(stateUpdate),
          updatedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: yjsSnapshots.roomId,
          set: {
            snapshot: Buffer.from(stateUpdate),
            updatedAt: new Date(),
          },
        });
    } catch (err) {
      console.error(`Failed to save Yjs snapshot for room ${roomId}:`, err);
    }
  }
}

export const roomHub = new RoomHub();
