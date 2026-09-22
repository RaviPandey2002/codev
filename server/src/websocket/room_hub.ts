import { roomFiles, yjsSnapshots } from './../db/schema';
import * as Y from 'yjs';
import { Doc } from 'yjs';
import * as syncProtocol from 'y-protocols/sync';
import * as awarenessProtocol from 'y-protocols/awareness';
import * as encoding from 'lib0/encoding';
import * as decoding from 'lib0/decoding';
import { db } from '../db';
import { desc, eq } from 'drizzle-orm';
import type { WebSocket } from 'ws';

export const MESSAGE_SYNC = 0;
export const MESSAGE_AWARENESS = 1;

interface RoomSession {
  doc: Y.Doc;                                // The mathematical CRDT document containing the code
  awareness: awarenessProtocol.Awareness;    // Tracks where every user's cursor is
  conns: Map<WebSocket, Set<number>>;        // Active WebSocket connections in this room
  saveTimeout: NodeJS.Timeout | null;        // Debounce timer for saving snapshots to PostgreSQL
}

class RoomHub {

  private rooms = new Map<string, RoomSession>();

  async getOrCreateRoomSession(roomId: string): Promise<RoomSession> {

    // 1. If the room is already loaded in RAM, return it immediately!
    let room = this.rooms.get(roomId);
    if (room) return room;

    // 2. Room is not in the ram (this is the first user connection)
    const doc = new Y.Doc();
    const awareness = new awarenessProtocol.Awareness(doc);

    const latestSnapshot = await db.query.yjsSnapshots.findFirst({
      where: eq(yjsSnapshots.roomId, roomId),
      orderBy: [desc(yjsSnapshots.updatedAt)]
    });

    if (latestSnapshot && latestSnapshot.snapshot) {
      Y.applyUpdate(doc, new Uint8Array(latestSnapshot.snapshot));
    } else {
      // 4. No previous snapshot exists -> Seed the document with the initial boilerplate file!
      const file = await db.query.roomFiles.findFirst({
        where: eq(roomFiles?.roomId, roomId)
      });

      if (file && file.content) {
        // 'monaco' is the shared text identifier we bind Monaco Editor to
        const yText = doc.getText('monaco');
        yText.insert(0, file.content);
      }
    }

    // 5. Package the session and store it in our rooms Map
    room = {
      doc,
      awareness,
      conns: new Map(),
      saveTimeout: null,
    };

    this.rooms.set(roomId, room);

    // 6. Broadcast awareness (cursor / selection) updates to all peers in this room
    awareness.on('update', ({ added, updated, removed }: { added: number[]; updated: number[]; removed: number[] }, origin: any) => {
      // Track which client IDs belong to which WebSocket connection
      if (origin && room!.conns.has(origin)) {
        const controlled = room!.conns.get(origin)!;
        added.forEach(id => controlled.add(id));
        removed.forEach(id => controlled.delete(id));
      }
      // Encode the cursor delta into a binary frame
      const changedClients = added.concat(updated, removed);
      const encoder = encoding.createEncoder();
      encoding.writeVarUint(encoder, MESSAGE_AWARENESS);
      encoding.writeVarUint8Array(
        encoder,
        awarenessProtocol.encodeAwarenessUpdate(awareness, changedClients)
      );
      const buff = encoding.toUint8Array(encoder);
      // Broadcast to everyone in the room except the peer who moved their cursor
      room!.conns.forEach((_, c) => {
        if (c !== origin && c.readyState === 1) { // 1 = WebSocket.OPEN
          c.send(buff);
        }
      });
    });


    return room;
  }

  /**
   * Called when a new WebSocket connects to a room
   */
  async handleConnection(
    conn: WebSocket,
    roomId: string,
    user: { id: string, username: string }
  ) {
    const room = await this.getOrCreateRoomSession(roomId);
    const controlledIds = new Set<number>();

    room.conns.set(conn, controlledIds);

    // --- STEP 1: Handshake (Send SyncStep 1) ---
    // Tells the client: "Here is the current state vector of the server's document"
    const encoder = encoding.createEncoder();
    encoding.writeVarUint(encoder, MESSAGE_SYNC);
    syncProtocol.writeSyncStep1(encoder, room.doc);
    conn.send(encoding.toUint8Array(encoder));

    // --- STEP 2: Send current active peer cursors ---
    // If Alice is already in the room, Bob needs to see Alice's cursor immediately
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

    // --- STEP 3: Listen for incoming binary messages from this peer ---
    conn.on('message', (data: Buffer) => {
      try {
        const uint8Data = new Uint8Array(data);
        const decoder = decoding.createDecoder(uint8Data);
        // The first byte tells us if it's a code edit (0) or cursor movement (1)
        const messageType = decoding.readVarUint(decoder);
        if (messageType === MESSAGE_SYNC) {
          const syncEncoder = encoding.createEncoder();
          encoding.writeVarUint(syncEncoder, MESSAGE_SYNC);
          // Apply client's edit to the server's Y.Doc
          syncProtocol.readSyncMessage(decoder, syncEncoder, room.doc, conn);
          // If the server needed to answer a sync step, send the response
          if (encoding.length(syncEncoder) > 1) {
            conn.send(encoding.toUint8Array(syncEncoder));
          }
          // Broadcast this keystroke to all OTHER peers in the room!
          this.broadcastDelta(room, uint8Data, conn);
          // Schedule a debounced save to PostgreSQL
          this.scheduleSnapshotSave(roomId, room);
        } else if (messageType === MESSAGE_AWARENESS) {
          // Peer moved their cursor or updated selection
          awarenessProtocol.applyAwarenessUpdate(
            room.awareness,
            decoding.readVarUint8Array(decoder),
            conn
          );
        }
      } catch (err) {
        console.error('WebSocket message processing error:', err);
      }
    });

    // --- STEP 4: Handle Disconnection & Cleanup ---
    conn.on('close', () => {
      const controlled = room.conns.get(conn);
      room.conns.delete(conn);
      // Remove this user's cursor from everyone else's screen
      if (controlled && controlled.size > 0) {
        awarenessProtocol.removeAwarenessStates(
          room.awareness,
          Array.from(controlled),
          null
        );
      }
      // If everyone left the room, immediately save snapshot to database and free RAM
      if (room.conns.size === 0) {
        this.saveSnapshot(roomId, room);
        this.rooms.delete(roomId);
      }
    });

  }

  /**
   * Forwards a binary update to all peers in the room EXCEPT the sender
   */
  private broadcastDelta(room: RoomSession, message: Uint8Array, sender: WebSocket) {
    room.conns.forEach((_, conn) => {
      if (conn !== sender && conn.readyState === 1) { // 1 = WebSocket.OPEN
        conn.send(message);
      }
    });
  }
  /**
   * Debounces saving to PostgreSQL so we don't spam the database on every keystroke
   */
  private scheduleSnapshotSave(roomId: string, room: RoomSession) {
    if (room.saveTimeout) clearTimeout(room.saveTimeout);
    room.saveTimeout = setTimeout(() => {
      this.saveSnapshot(roomId, room);
    }, 5000); // Saves after 5 seconds of typing inactivity
  }
  /**
   * Persists the raw binary document state into the `yjs_snapshots` table
   */
  private async saveSnapshot(roomId: string, room: RoomSession) {
    try {
      // Encode the entire Y.Doc state into raw binary bytes
      const stateUpdate = Y.encodeStateAsUpdate(room.doc);
      await db.insert(yjsSnapshots).values({
        roomId,
        snapshot: Buffer.from(stateUpdate),
        updatedAt: new Date(),
      }).onConflictDoUpdate({
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