import type { RoomRole, RoomSourceType } from './schemas/rooms';

// WebSocket message shapes — used by both client and server
export type WSMessage =
  | { type: 'yjs-update'; payload: number[] }
  | { type: 'chat-message'; userId: string; username: string; text: string; timestamp: number }
  | { type: 'room-error'; code: 'NOT_FOUND' | 'UNAUTHORIZED' };

// User DTO
export type UserDTO = {
  id: string;
  username: string;
  email: string;
};

// Room DTO
export type RoomDTO = {
  id: string;
  name: string;
  description: string | null;
  sourceType: RoomSourceType;
  githubRepo: string | null;
  githubBranch: string | null;
  isPrivate: boolean;
  ownerId: string;
  role: RoomRole;
  peersCount?: number;
  filesCount?: number;
  createdAt: string;
  updatedAt: string;
};

// Room Member DTO
export type RoomMemberDTO = {
  id: string;
  roomId: string;
  userId: string;
  username: string;
  role: RoomRole;
  joinedAt: string;
};

// Room File DTO
export type RoomFileDTO = {
  id: string;
  roomId: string;
  path: string;
  content: string;
  updatedAt: string;
};
