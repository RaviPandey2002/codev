import type { ArenaPlatform, RoomRole, RoomSourceType } from './schemas/rooms';

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
  /** Platform specialization for COMPILER (CP Arena) rooms. */
  arenaPlatform: ArenaPlatform | null;
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

export type TestCase = {
  input: string;
  output?: string;
};

export type TestCaseItem = {
  id: string;
  name?: string;
  input: string;
  output: string;
};

export interface CodeSnippet {
  lang: string;
  langSlug: string;
  code: string;
}

// Competitive Programming Problem Data DTO
export type ProblemData = {
  title: string;
  platform: ArenaPlatform;
  url?: string;
  contestId?: number;
  index?: string;
  timeLimit?: string;
  memoryLimit?: string;
  difficulty?: string;
  tags?: string[];
  description?: string;
  inputSpecification?: string;
  outputSpecification?: string;
  sampleInput?: string;
  sampleOutput?: string;
  sampleCases?: TestCase[];
  codeSnippets?: CodeSnippet[];
};

export type QueueProblemStatus = 'TODO' | 'SOLVING' | 'SOLVED' | 'SKIPPED';

export interface QueueProblemItem {
  id: string;
  platform: ArenaPlatform;
  urlOrId: string;
  title: string;
  difficulty?: string;
  tags?: string[];
  description?: string;
  sampleCases: TestCaseItem[];
  codeSnippets?: CodeSnippet[];
  status: QueueProblemStatus;
  timeSpentSeconds?: number;
}

export interface WishlistDTO {
  id: string;
  ownerId: string;
  ownerUsername?: string;
  roomId: string | null;
  name: string;
  description: string | null;
  visibility: 'PRIVATE' | 'ROOM' | 'PUBLIC';
  itemCount: number;
  problemKeys: string[];
  isOwner: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface WishlistItemDTO {
  id: string;
  wishlistId: string;
  problemId: string;
  canonicalKey: string;
  position: number;
  note: string | null;
  addedAt: string;
  problem: ProblemData;
}

export interface WishlistWithItemsDTO extends WishlistDTO {
  items: WishlistItemDTO[];
}
