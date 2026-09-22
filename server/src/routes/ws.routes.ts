import { FastifyInstance, FastifyRequest } from 'fastify';
import jwt from 'jsonwebtoken';
import { db } from '../db';
import { rooms, roomMembers } from '../db/schema';
import { and, eq } from 'drizzle-orm';
import { roomHub } from '../websocket/room_hub';
import type { WebSocket } from 'ws';

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
    async (socket: WebSocket, req: FastifyRequest<{ Params: WsParams, Querystring: WsQuery }>) => {
      const user = authenticateSocket(req);
      if (!user) {
        socket.close(4401, 'Unauthorized');
        return;
      }

      const { roomId } = req.params;

      const room = await db.query.rooms.findFirst({ where: eq(rooms.id, roomId) });

      if (!room) {
        socket.close(4404, 'Room not found');
        return;
      }

      if (room.isPrivate && room.ownerId !== user.userId) {
        const member = await db.query.roomMembers.findFirst({
          where: and(
            eq(roomMembers.roomId, roomId),
            eq(roomMembers.userId, user.userId)
          )
        });

        if (!member) {
          socket.close(4403, 'Forbiddden');
          return;
        }
      }
      await roomHub.handleConnection(socket, roomId, { id: user.userId, username: user.username });

    }
  )
}