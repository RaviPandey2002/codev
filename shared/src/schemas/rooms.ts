import { z } from 'zod';

export const roomSourceTypeSchema = z.enum(['SCRATCHPAD', 'COMPILER', 'GITHUB', 'TEMPLATE']);
export type RoomSourceType = z.infer<typeof roomSourceTypeSchema>;

export const roomRoleSchema = z.enum(['OWNER', 'EDITOR', 'VIEWER']);
export type RoomRole = z.infer<typeof roomRoleSchema>;

export const roomTemplateSchema = z.enum([
  'typescript',
  'react',
  'python',
  'c',
  'cpp',
  'javascript',
]);
export type RoomTemplate = z.infer<typeof roomTemplateSchema>;

export const createRoomSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Workspace name is required')
    .max(100, 'Workspace name cannot exceed 100 characters'),
  description: z.string().trim().max(500, 'Description cannot exceed 500 characters').optional(),
  sourceType: roomSourceTypeSchema.optional().default('SCRATCHPAD'),
  template: roomTemplateSchema.optional().default('typescript'),
  isPrivate: z.boolean().optional().default(false),
  githubRepo: z.string().trim().max(255).optional(),
  githubBranch: z.string().trim().max(100).optional(),
});

export type CreateRoomInput = z.input<typeof createRoomSchema>;
export type CreateRoomOutput = z.output<typeof createRoomSchema>;


export const joinRoomSchema = z.object({
  roomId: z
    .string()
    .trim()
    .min(3, 'Room code must be at least 3 characters')
    .max(21, 'Room code cannot exceed 21 characters')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Room code may only contain letters, numbers, hyphens, and underscores'),
});

export type JoinRoomInput = z.infer<typeof joinRoomSchema>;
