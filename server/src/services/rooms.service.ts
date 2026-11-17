import { eq, and, desc, or, ilike } from 'drizzle-orm';
import { db } from '../db';
import { rooms, roomMembers, roomFiles, users } from '../db/schema';
import { AppError } from '../utils/errors';
import { generateRoomId } from '../utils/id';
import { roomHub } from '../websocket/room_hub';
import type {
  RoomDTO,
  RoomFileDTO,
  RoomMemberDTO,
  RoomRole,
  RoomSourceType,
  RoomTemplate,
} from '@codev/shared';

interface CreateRoomParams {
  userId: string;
  name: string;
  description?: string;
  sourceType?: RoomSourceType;
  template?: RoomTemplate;
  isPrivate?: boolean;
  githubRepo?: string;
  githubBranch?: string;
}

interface SeedConfig {
  path: string;
  content: string;
}

function getTemplateSeed(template: RoomTemplate = 'typescript', sourceType: RoomSourceType = 'SCRATCHPAD'): SeedConfig {
  if (sourceType === 'COMPILER' && template === 'typescript') {
    // Default compiler room to C++ competitive programming
    template = 'cpp';
  }

  switch (template) {
    case 'cpp':
      return {
        path: 'main.cpp',
        content: `#include <bits/stdc++.h>
using namespace std;

// CodeV Competitive Programming Arena
// Fast I/O for competitive programming
int main() {
    ios_base::sync_with_stdio(false);
    cin.tie(NULL);

    int t = 1;
    // cin >> t; // Uncomment for multi-testcase problems
    while (t--) {
        cout << "Hello from CodeV Competitive Arena!\\n";
    }
    return 0;
}
`,
      };

    case 'c':
      return {
        path: 'main.c',
        content: `#include <stdio.h>

// CodeV Online C Compiler
int main() {
    printf("Hello from CodeV C Compiler!\\n");
    return 0;
}
`,
      };

    case 'python':
      return {
        path: 'main.py',
        content: `# CodeV Python Workspace
import sys

def solve():
    print("Hello from CodeV Python runner!")

if __name__ == "__main__":
    solve()
`,
      };

    case 'react':
      return {
        path: 'App.tsx',
        content: `import React, { useState } from 'react';

export default function App() {
  const [count, setCount] = useState(0);

  return (
    <div style={{ padding: '2rem', fontFamily: 'sans-serif' }}>
      <h1>CodeV React Sandbox</h1>
      <p>Real-time collaborative component prototyping</p>
      <button onClick={() => setCount((c) => c + 1)}>
        Count: {count}
      </button>
    </div>
  );
}
`,
      };

    case 'javascript':
      return {
        path: 'main.js',
        content: `// CodeV JavaScript Workspace
console.log("Hello from CodeV!");
`,
      };

    case 'typescript':
    default:
      return {
        path: 'main.ts',
        content: `// Welcome to CodeV — Real-Time Collaborative Workspace
// Share this room link to pair program in real-time!

function main() {
  const greeting: string = "Hello, CodeV!";
  console.log(greeting);
}

main();
`,
      };
  }
}

export async function createRoom({
  userId,
  name,
  description,
  sourceType = 'SCRATCHPAD',
  template = 'typescript',
  isPrivate = false,
  githubRepo,
  githubBranch,
}: CreateRoomParams): Promise<RoomDTO> {
  const roomId = generateRoomId();
  const seed = getTemplateSeed(template, sourceType);

  const [newRoom] = await db.transaction(async (tx) => {
    // 1. Insert room record
    const [created] = await tx
      .insert(rooms)
      .values({
        id: roomId,
        name,
        description: description || null,
        sourceType,
        githubRepo: githubRepo || null,
        githubBranch: githubBranch || null,
        isPrivate,
        ownerId: userId,
      })
      .returning();

    // 2. Add creator as OWNER
    await tx.insert(roomMembers).values({
      roomId,
      userId,
      role: 'OWNER',
    });

    // 3. Seed initial file
    await tx.insert(roomFiles).values({
      roomId,
      path: seed.path,
      content: seed.content,
    });

    return [created];
  });

  return {
    id: newRoom.id,
    name: newRoom.name,
    description: newRoom.description,
    sourceType: newRoom.sourceType as RoomSourceType,
    githubRepo: newRoom.githubRepo,
    githubBranch: newRoom.githubBranch,
    isPrivate: newRoom.isPrivate,
    ownerId: newRoom.ownerId,
    role: 'OWNER',
    peersCount: 1,
    filesCount: 1,
    createdAt: newRoom.createdAt.toISOString(),
    updatedAt: newRoom.updatedAt.toISOString(),
  };
}

export async function listUserRooms(userId: string): Promise<RoomDTO[]> {
  const memberships = await db
    .select({
      room: rooms,
      role: roomMembers.role,
    })
    .from(roomMembers)
    .innerJoin(rooms, eq(roomMembers.roomId, rooms.id))
    .where(eq(roomMembers.userId, userId))
    .orderBy(desc(rooms.updatedAt));

  return memberships.map(({ room, role }) => ({
    id: room.id,
    name: room.name,
    description: room.description,
    sourceType: room.sourceType as RoomSourceType,
    githubRepo: room.githubRepo,
    githubBranch: room.githubBranch,
    isPrivate: room.isPrivate,
    ownerId: room.ownerId,
    role: role as RoomRole,
    createdAt: room.createdAt.toISOString(),
    updatedAt: room.updatedAt.toISOString(),
  }));
}

export async function getRoomDetails(
  roomId: string,
  userId: string
): Promise<{ room: RoomDTO; files: RoomFileDTO[]; userRole: RoomRole | null }> {
  const [roomRecord] = await db.select().from(rooms).where(eq(rooms.id, roomId)).limit(1);

  if (!roomRecord) {
    throw new AppError('Workspace not found', 404, 'ROOM_NOT_FOUND');
  }

  // Check user membership
  const [membership] = await db
    .select()
    .from(roomMembers)
    .where(and(eq(roomMembers.roomId, roomId), eq(roomMembers.userId, userId)))
    .limit(1);

  if (roomRecord.isPrivate && !membership) {
    throw new AppError('Access denied to private workspace', 403, 'FORBIDDEN');
  }

  const files = await db
    .select()
    .from(roomFiles)
    .where(eq(roomFiles.roomId, roomId));

  const roomDto: RoomDTO = {
    id: roomRecord.id,
    name: roomRecord.name,
    description: roomRecord.description,
    sourceType: roomRecord.sourceType as RoomSourceType,
    githubRepo: roomRecord.githubRepo,
    githubBranch: roomRecord.githubBranch,
    isPrivate: roomRecord.isPrivate,
    ownerId: roomRecord.ownerId,
    role: (membership?.role as RoomRole) || 'VIEWER',
    filesCount: files.length,
    createdAt: roomRecord.createdAt.toISOString(),
    updatedAt: roomRecord.updatedAt.toISOString(),
  };

  const fileDtos: RoomFileDTO[] = files.map((f) => ({
    id: f.id,
    roomId: f.roomId,
    path: f.path,
    content: f.content,
    updatedAt: f.updatedAt.toISOString(),
  }));

  return {
    room: roomDto,
    files: fileDtos,
    userRole: (membership?.role as RoomRole) || null,
  };
}

export async function joinRoom(roomId: string, userId: string): Promise<RoomDTO> {
  const [roomRecord] = await db.select().from(rooms).where(eq(rooms.id, roomId)).limit(1);

  if (!roomRecord) {
    throw new AppError('Workspace not found. Please check your room code.', 404, 'ROOM_NOT_FOUND');
  }

  // Check if already a member
  const [existingMember] = await db
    .select()
    .from(roomMembers)
    .where(and(eq(roomMembers.roomId, roomId), eq(roomMembers.userId, userId)))
    .limit(1);

  // If room is private, only owner and existing members may join
  if (roomRecord.isPrivate && roomRecord.ownerId !== userId && !existingMember) {
    throw new AppError('Cannot join private workspace without an invite', 403, 'FORBIDDEN');
  }

  let userRole: RoomRole = 'EDITOR';

  if (existingMember) {
    userRole = existingMember.role as RoomRole;
  } else {
    // Add user as EDITOR
    await db.insert(roomMembers).values({
      roomId,
      userId,
      role: 'EDITOR',
    });
  }

  return {
    id: roomRecord.id,
    name: roomRecord.name,
    description: roomRecord.description,
    sourceType: roomRecord.sourceType as RoomSourceType,
    githubRepo: roomRecord.githubRepo,
    githubBranch: roomRecord.githubBranch,
    isPrivate: roomRecord.isPrivate,
    ownerId: roomRecord.ownerId,
    role: userRole,
    createdAt: roomRecord.createdAt.toISOString(),
    updatedAt: roomRecord.updatedAt.toISOString(),
  };
}

export async function deleteOrLeaveRoom(
  roomId: string,
  userId: string
): Promise<{ deleted: boolean; left: boolean }> {
  const [roomRecord] = await db.select().from(rooms).where(eq(rooms.id, roomId)).limit(1);

  if (!roomRecord) {
    throw new AppError('Workspace not found', 404, 'ROOM_NOT_FOUND');
  }

  // If user is owner: delete the workspace and purge active session
  if (roomRecord.ownerId === userId) {
    roomHub.destroyRoomSession(roomId);
    await db.delete(rooms).where(eq(rooms.id, roomId));
    return { deleted: true, left: false };
  }

  // Otherwise, user is a collaborator/viewer leaving the workspace
  const [membership] = await db
    .select()
    .from(roomMembers)
    .where(and(eq(roomMembers.roomId, roomId), eq(roomMembers.userId, userId)))
    .limit(1);

  if (!membership) {
    throw new AppError('You are not a member of this workspace', 403, 'FORBIDDEN');
  }

  // Sever active WebSocket connections for this departing user
  roomHub.disconnectUser(roomId, userId);

  await db
    .delete(roomMembers)
    .where(and(eq(roomMembers.roomId, roomId), eq(roomMembers.userId, userId)));

  return { deleted: false, left: true };
}

export async function inviteRoomMember(params: {
  roomId: string;
  ownerId: string;
  identifier: string;
  role?: RoomRole;
}): Promise<RoomMemberDTO> {
  const { roomId, ownerId, identifier, role = 'EDITOR' } = params;

  const [roomRecord] = await db.select().from(rooms).where(eq(rooms.id, roomId)).limit(1);
  if (!roomRecord) {
    throw new AppError('Workspace not found', 404, 'ROOM_NOT_FOUND');
  }

  if (roomRecord.ownerId !== ownerId) {
    throw new AppError('Only the workspace owner can invite members', 403, 'FORBIDDEN');
  }

  // Lookup target user by username or email
  const [targetUser] = await db
    .select({ id: users.id, username: users.username, email: users.email })
    .from(users)
    .where(or(ilike(users.username, identifier), ilike(users.email, identifier)))
    .limit(1);

  if (!targetUser) {
    throw new AppError(`User "${identifier}" not found`, 404, 'USER_NOT_FOUND');
  }

  if (targetUser.id === ownerId) {
    throw new AppError('User is already the workspace owner', 400, 'CANNOT_INVITE_OWNER');
  }

  // Check if target user is already a member
  const [existingMember] = await db
    .select()
    .from(roomMembers)
    .where(and(eq(roomMembers.roomId, roomId), eq(roomMembers.userId, targetUser.id)))
    .limit(1);

  if (existingMember) {
    // Update role if changed
    if (existingMember.role !== role) {
      await db
        .update(roomMembers)
        .set({ role })
        .where(eq(roomMembers.id, existingMember.id));
    }
    return {
      id: existingMember.id,
      roomId,
      userId: targetUser.id,
      username: targetUser.username,
      role,
      joinedAt: existingMember.joinedAt.toISOString(),
    };
  }

  // Add new member
  const [newMember] = await db
    .insert(roomMembers)
    .values({
      roomId,
      userId: targetUser.id,
      role,
    })
    .returning();

  return {
    id: newMember.id,
    roomId,
    userId: targetUser.id,
    username: targetUser.username,
    role: newMember.role as RoomRole,
    joinedAt: newMember.joinedAt.toISOString(),
  };
}

export async function listRoomMembers(
  roomId: string,
  userId: string
): Promise<{
  owner: { userId: string; username: string; email: string };
  members: RoomMemberDTO[];
}> {
  const [roomRecord] = await db.select().from(rooms).where(eq(rooms.id, roomId)).limit(1);
  if (!roomRecord) {
    throw new AppError('Workspace not found', 404, 'ROOM_NOT_FOUND');
  }

  // Check user access
  if (roomRecord.isPrivate && roomRecord.ownerId !== userId) {
    const [membership] = await db
      .select({ id: roomMembers.id })
      .from(roomMembers)
      .where(and(eq(roomMembers.roomId, roomId), eq(roomMembers.userId, userId)))
      .limit(1);
    if (!membership) {
      throw new AppError('Access to this private workspace is forbidden', 403, 'FORBIDDEN');
    }
  }

  // Fetch owner details
  const [owner] = await db
    .select({ id: users.id, username: users.username, email: users.email })
    .from(users)
    .where(eq(users.id, roomRecord.ownerId))
    .limit(1);

  // Fetch members
  const memberRows = await db
    .select({
      id: roomMembers.id,
      roomId: roomMembers.roomId,
      userId: roomMembers.userId,
      username: users.username,
      role: roomMembers.role,
      joinedAt: roomMembers.joinedAt,
    })
    .from(roomMembers)
    .innerJoin(users, eq(roomMembers.userId, users.id))
    .where(eq(roomMembers.roomId, roomId))
    .orderBy(desc(roomMembers.joinedAt));

  return {
    owner: {
      userId: owner?.id || roomRecord.ownerId,
      username: owner?.username || 'Unknown',
      email: owner?.email || '',
    },
    members: memberRows.map((m) => ({
      id: m.id,
      roomId: m.roomId,
      userId: m.userId,
      username: m.username,
      role: m.role as RoomRole,
      joinedAt: m.joinedAt.toISOString(),
    })),
  };
}

export async function removeRoomMember(
  roomId: string,
  ownerId: string,
  targetUserId: string
): Promise<{ removed: boolean }> {
  const [roomRecord] = await db.select().from(rooms).where(eq(rooms.id, roomId)).limit(1);
  if (!roomRecord) {
    throw new AppError('Workspace not found', 404, 'ROOM_NOT_FOUND');
  }

  if (roomRecord.ownerId !== ownerId) {
    throw new AppError('Only the workspace owner can remove members', 403, 'FORBIDDEN');
  }

  if (targetUserId === ownerId) {
    throw new AppError('Cannot remove workspace owner', 400, 'CANNOT_REMOVE_OWNER');
  }

  const [membership] = await db
    .select({ id: roomMembers.id })
    .from(roomMembers)
    .where(and(eq(roomMembers.roomId, roomId), eq(roomMembers.userId, targetUserId)))
    .limit(1);

  if (!membership) {
    throw new AppError('Member not found in workspace', 404, 'MEMBER_NOT_FOUND');
  }

  roomHub.disconnectUser(roomId, targetUserId);

  await db
    .delete(roomMembers)
    .where(and(eq(roomMembers.roomId, roomId), eq(roomMembers.userId, targetUserId)));

  return { removed: true };
}


