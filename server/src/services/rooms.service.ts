import { eq, and, desc } from 'drizzle-orm';
import { db } from '../db';
import { rooms, roomMembers, roomFiles } from '../db/schema';
import { AppError } from '../utils/errors';
import { generateRoomId } from '../utils/id';
import type {
  RoomDTO,
  RoomFileDTO,
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

