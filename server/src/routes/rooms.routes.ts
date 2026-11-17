import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import {
  createRoomSchema,
  CreateRoomInput,
  inviteMemberSchema,
  InviteMemberInput,
} from '@codev/shared';
import { validateBody, validateParams } from '../utils/validate';
import { auth } from '../hooks/authenticate';
import * as roomsService from '../services/rooms.service';

const roomIdParamSchema = z.object({
  id: z
    .string()
    .trim()
    .min(3)
    .max(21)
    .regex(/^[a-zA-Z0-9_-]+$/, 'Invalid room ID format'),
});

type RoomIdParams = z.infer<typeof roomIdParamSchema>;

const roomMemberParamsSchema = z.object({
  id: z
    .string()
    .trim()
    .min(3)
    .max(21)
    .regex(/^[a-zA-Z0-9_-]+$/, 'Invalid room ID format'),
  userId: z.string().uuid('Invalid user ID format'),
});

type RoomMemberParams = z.infer<typeof roomMemberParamsSchema>;

export default async function roomRoutes(app: FastifyInstance) {
  // All room routes require authentication
  app.addHook('preHandler', auth);

  // POST /rooms - Create a new room
  app.post(
    '/',
    { preHandler: [validateBody(createRoomSchema)] },
    async (req, reply) => {
      const input = req.body as CreateRoomInput;
      const room = await roomsService.createRoom({
        userId: req.user.id,
        name: input.name,
        description: input.description,
        sourceType: input.sourceType,
        template: input.template,
        isPrivate: input.isPrivate,
        githubRepo: input.githubRepo,
        githubBranch: input.githubBranch,
      });

      return reply.status(201).send({ room });
    }
  );

  // GET /rooms - List user's rooms
  app.get('/', async (req, reply) => {
    const userRooms = await roomsService.listUserRooms(req.user.id);
    return reply.status(200).send({ rooms: userRooms });
  });

  // GET /rooms/:id - Get room details and file manifest
  app.get(
    '/:id',
    { preHandler: [validateParams(roomIdParamSchema)] },
    async (req, reply) => {
      const { id } = req.params as RoomIdParams;
      const details = await roomsService.getRoomDetails(id, req.user.id);
      return reply.status(200).send(details);
    }
  );

  // POST /rooms/:id/join - Join a room by code
  app.post(
    '/:id/join',
    { preHandler: [validateParams(roomIdParamSchema)] },
    async (req, reply) => {
      const { id } = req.params as RoomIdParams;
      const room = await roomsService.joinRoom(id, req.user.id);
      return reply.status(200).send({ room });
    }
  );

  // DELETE /rooms/:id - Delete workspace (owner) or leave workspace (collaborator)
  app.delete(
    '/:id',
    { preHandler: [validateParams(roomIdParamSchema)] },
    async (req, reply) => {
      const { id } = req.params as RoomIdParams;
      const result = await roomsService.deleteOrLeaveRoom(id, req.user.id);
      return reply.status(200).send({ ok: true, ...result });
    }
  );

  // POST /rooms/:id/members - Invite collaborator to workspace
  app.post(
    '/:id/members',
    {
      preHandler: [
        validateParams(roomIdParamSchema),
        validateBody(inviteMemberSchema),
      ],
    },
    async (req, reply) => {
      const { id } = req.params as RoomIdParams;
      const input = req.body as InviteMemberInput;
      const member = await roomsService.inviteRoomMember({
        roomId: id,
        ownerId: req.user.id,
        identifier: input.identifier,
        role: input.role,
      });
      return reply.status(201).send({ member });
    }
  );

  // GET /rooms/:id/members - List workspace owner & members
  app.get(
    '/:id/members',
    { preHandler: [validateParams(roomIdParamSchema)] },
    async (req, reply) => {
      const { id } = req.params as RoomIdParams;
      const result = await roomsService.listRoomMembers(id, req.user.id);
      return reply.status(200).send(result);
    }
  );

  // DELETE /rooms/:id/members/:userId - Remove collaborator from workspace (owner only)
  app.delete(
    '/:id/members/:userId',
    { preHandler: [validateParams(roomMemberParamsSchema)] },
    async (req, reply) => {
      const { id, userId } = req.params as RoomMemberParams;
      const result = await roomsService.removeRoomMember(id, req.user.id, userId);
      return reply.status(200).send({ ok: true, ...result });
    }
  );
}

