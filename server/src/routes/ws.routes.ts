import { FastifyInstance, FastifyRequest } from 'fastify';
import jwt from 'jsonwebtoken';
import { db } from '../db';
import { rooms, roomMembers } from '../db/schema';
import { and, eq } from 'drizzle-orm';
import { roomHub } from '../websocket/room_hub';
import type { WebSocket } from 'ws';
import type { RoomRole } from '@codev/shared';

interface TokenPayload extends jwt.JwtPayload {
  userId: string;
  email: string;
  username: string;
}
interface WsParams {
  roomId: string;
}
interface WsQuery {
  token?: string;
}

function authenticateSocket(req: FastifyRequest<{ Querystring: WsQuery }>): TokenPayload | null {
  const token = req.cookies.accessToken || req.query.token || req.headers.authorization?.replace('Bearer ', '');

  if (!token) return null;

  const secret = process.env.JWT_SECRET;
  if (!secret) return null;

  try {
    return jwt.verify(token, secret) as TokenPayload;
  } catch (err) {
    return null;
  }
}

export default async function wsRoutes(app: FastifyInstance) {
  app.get(
    '/rooms/:roomId',
    { websocket: true },
    async (socket: WebSocket, req: FastifyRequest<{ Params: WsParams; Querystring: WsQuery }>) => {
      // Validate Origin header if present (CSWSH Defense)
      const allowedOrigin = process.env.CLIENT_URL;
      const origin = req.headers.origin;
      if (allowedOrigin && origin) {
        const allowedList = allowedOrigin.split(',').map((s) => s.trim().toLowerCase());
        const normOrigin = origin.trim().toLowerCase();
        const isMatch = allowedList.includes('*') || allowedList.includes(normOrigin);
        if (!isMatch) {
          console.warn(`[WS CSWSH] Blocked connection from unauthorized origin: ${origin}. Allowed: ${allowedOrigin}`);
          socket.close(4403, 'Forbidden origin');
          return;
        }
      }

      // Buffer any incoming frames that arrive while async auth/DB checks are running
      const earlyMessages: Buffer[] = [];
      const onEarlyMessage = (data: Buffer) => {
        earlyMessages.push(Buffer.from(data));
      };
      socket.on('message', onEarlyMessage);

      try {
        const user = authenticateSocket(req);
        if (!user) {
          socket.off('message', onEarlyMessage);
          socket.close(4401, 'Unauthorized');
          return;
        }

        const { roomId } = req.params;

        const room = await db.query.rooms.findFirst({ where: eq(rooms.id, roomId) });

        if (!room) {
          socket.off('message', onEarlyMessage);
          socket.close(4404, 'Room not found');
          return;
        }

        let userRole: RoomRole = 'VIEWER';
        if (room.ownerId === user.userId) {
          userRole = 'OWNER';
        } else {
          const member = await db.query.roomMembers.findFirst({
            where: and(
              eq(roomMembers.roomId, roomId),
              eq(roomMembers.userId, user.userId)
            ),
          });

          if (member) {
            userRole = member.role as RoomRole;
          } else if (room.isPrivate) {
            socket.off('message', onEarlyMessage);
            socket.close(4403, 'Forbidden');
            return;
          } else {
            userRole = 'VIEWER';
          }
        }

        await roomHub.handleConnection(
          socket,
          roomId,
          { id: user.userId, username: user.username },
          userRole,
          earlyMessages,
          onEarlyMessage
        );
      } catch (err) {
        socket.off('message', onEarlyMessage);
        console.error('WebSocket connection error:', err);
        if (socket.readyState === 1) {
          socket.close(1011, 'Internal Server Error');
        }
      }
    }
  );
}
