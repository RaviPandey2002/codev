import { and, asc, desc, eq, inArray, or, sql } from 'drizzle-orm';
import {
  getCanonicalProblemKey,
  type AddWishlistItemInput,
  type ArenaPlatform,
  type CreateWishlistInput,
  type ProblemData,
  type RoomRole,
  type UpdateWishlistInput,
  type WishlistDTO,
  type WishlistItemDTO,
  type WishlistVisibility,
  type WishlistWithItemsDTO,
} from '@codev/shared';
import { db } from '../db';
import {
  roomMembers,
  rooms,
  savedProblems,
  users,
  wishlistItems,
  wishlists,
} from '../db/schema';
import { AppError } from '../utils/errors';
import { importProblem } from './problems.service.js';

interface RoomAccessResult {
  canRead: boolean;
  canEdit: boolean;
  role: RoomRole | null;
}

async function getRoomAccess(roomId: string, userId: string): Promise<RoomAccessResult> {
  const [roomRecord] = await db
    .select({ id: rooms.id, ownerId: rooms.ownerId, isPrivate: rooms.isPrivate })
    .from(rooms)
    .where(eq(rooms.id, roomId))
    .limit(1);

  if (!roomRecord) {
    throw new AppError('Workspace not found', 404, 'ROOM_NOT_FOUND');
  }

  const [membership] = await db
    .select({ role: roomMembers.role })
    .from(roomMembers)
    .where(and(eq(roomMembers.roomId, roomId), eq(roomMembers.userId, userId)))
    .limit(1);

  const isOwner = roomRecord.ownerId === userId;
  const role: RoomRole | null = isOwner
    ? 'OWNER'
    : (membership?.role as RoomRole | undefined) || null;

  const canRead = isOwner || Boolean(membership) || !roomRecord.isPrivate;
  const canEdit = isOwner || role === 'OWNER' || role === 'EDITOR';

  return { canRead, canEdit, role };
}

function isPlaceholderDescription(desc?: string | null): boolean {
  if (!desc || !desc.trim()) return true;
  return desc.startsWith('Imported from curated wishlist:');
}

function pickRicherDescription(
  incoming?: string | null,
  existing?: string | null
): string | null {
  if (!incoming || !incoming.trim()) return existing || null;
  if (!existing || !existing.trim()) return incoming;
  if (isPlaceholderDescription(existing) && !isPlaceholderDescription(incoming)) {
    return incoming;
  }
  if (isPlaceholderDescription(incoming) && !isPlaceholderDescription(existing)) {
    return existing;
  }
  return incoming.length >= existing.length ? incoming : existing;
}

function pickRicherArray<T>(incoming?: T[] | null, existing?: T[] | null): T[] {
  if (incoming && incoming.length > 0) return incoming;
  return existing || [];
}

async function upsertSavedProblem(problem: ProblemData) {
  const platform = (problem.platform || 'STANDARD_IO') as ArenaPlatform;
  const canonicalKey = getCanonicalProblemKey({
    platform,
    url: problem.url,
    contestId: problem.contestId,
    index: problem.index,
    title: problem.title,
  });

  const normalizedSampleCases =
    problem.sampleCases && problem.sampleCases.length > 0
      ? problem.sampleCases.map((c) => ({
          input: c.input,
          output: c.output ?? undefined,
        }))
      : problem.sampleInput
        ? [{ input: problem.sampleInput, output: problem.sampleOutput || '' }]
        : [];

  const [existing] = await db
    .select()
    .from(savedProblems)
    .where(
      and(
        eq(savedProblems.platform, platform),
        eq(savedProblems.canonicalKey, canonicalKey)
      )
    )
    .limit(1);

  if (!existing) {
    const [inserted] = await db
      .insert(savedProblems)
      .values({
        platform,
        canonicalKey,
        title: problem.title.slice(0, 300),
        url: problem.url || null,
        contestId: problem.contestId ?? null,
        problemIndex: problem.index || null,
        difficulty: problem.difficulty || null,
        timeLimit: problem.timeLimit || null,
        memoryLimit: problem.memoryLimit || null,
        tags: problem.tags || [],
        description: problem.description || null,
        inputSpecification: problem.inputSpecification || null,
        outputSpecification: problem.outputSpecification || null,
        sampleCases: normalizedSampleCases,
        codeSnippets: problem.codeSnippets || [],
      })
      .onConflictDoNothing()
      .returning();

    if (inserted) return inserted;

    // Concurrent insert race fallback
    const [concurrent] = await db
      .select()
      .from(savedProblems)
      .where(
        and(
          eq(savedProblems.platform, platform),
          eq(savedProblems.canonicalKey, canonicalKey)
        )
      )
      .limit(1);
    if (concurrent) return concurrent;
    throw new AppError('Failed to persist saved problem', 500, 'DB_ERROR');
  }

  const mergedDescription = pickRicherDescription(problem.description, existing.description);
  const mergedCases = pickRicherArray(normalizedSampleCases, existing.sampleCases);
  const mergedSnippets = pickRicherArray(problem.codeSnippets, existing.codeSnippets);
  const mergedTags = pickRicherArray(problem.tags, existing.tags);

  const [updated] = await db
    .update(savedProblems)
    .set({
      title: problem.title ? problem.title.slice(0, 300) : existing.title,
      url: problem.url || existing.url,
      contestId: problem.contestId ?? existing.contestId,
      problemIndex: problem.index || existing.problemIndex,
      difficulty: problem.difficulty || existing.difficulty,
      timeLimit: problem.timeLimit || existing.timeLimit,
      memoryLimit: problem.memoryLimit || existing.memoryLimit,
      tags: mergedTags,
      description: mergedDescription,
      inputSpecification: problem.inputSpecification || existing.inputSpecification,
      outputSpecification: problem.outputSpecification || existing.outputSpecification,
      sampleCases: mergedCases,
      codeSnippets: mergedSnippets,
      updatedAt: new Date(),
    })
    .where(eq(savedProblems.id, existing.id))
    .returning();

  return updated;
}

function mapSavedProblemToDTO(row: typeof savedProblems.$inferSelect): ProblemData {
  const sampleCases = row.sampleCases || [];
  return {
    title: row.title,
    platform: row.platform as ArenaPlatform,
    url: row.url || undefined,
    contestId: row.contestId ?? undefined,
    index: row.problemIndex || undefined,
    timeLimit: row.timeLimit || undefined,
    memoryLimit: row.memoryLimit || undefined,
    difficulty: row.difficulty || undefined,
    tags: row.tags || [],
    description: row.description || undefined,
    inputSpecification: row.inputSpecification || undefined,
    outputSpecification: row.outputSpecification || undefined,
    sampleInput: sampleCases[0]?.input || undefined,
    sampleOutput: sampleCases[0]?.output || undefined,
    sampleCases,
    codeSnippets: row.codeSnippets || [],
  };
}

async function assertWishlistReadAccess(wishlistId: string, userId: string) {
  const [row] = await db
    .select({
      wishlist: wishlists,
      ownerUsername: users.username,
    })
    .from(wishlists)
    .leftJoin(users, eq(wishlists.ownerId, users.id))
    .where(eq(wishlists.id, wishlistId))
    .limit(1);

  if (!row) {
    throw new AppError('Wishlist not found', 404, 'WISHLIST_NOT_FOUND');
  }

  const { wishlist, ownerUsername } = row;
  if (wishlist.ownerId === userId || wishlist.visibility === 'PUBLIC') {
    return { wishlist, ownerUsername: ownerUsername || undefined, canEdit: wishlist.ownerId === userId };
  }

  if (wishlist.visibility === 'ROOM' && wishlist.roomId) {
    const access = await getRoomAccess(wishlist.roomId, userId);
    if (access.canRead) {
      return { wishlist, ownerUsername: ownerUsername || undefined, canEdit: access.canEdit };
    }
  }

  throw new AppError('Access denied to private wishlist', 403, 'FORBIDDEN');
}

async function assertWishlistWriteAccess(wishlistId: string, userId: string) {
  const result = await assertWishlistReadAccess(wishlistId, userId);
  if (!result.canEdit) {
    throw new AppError(
      'You do not have permission to modify this wishlist',
      403,
      'FORBIDDEN'
    );
  }
  return result;
}

export async function listWishlists(
  userId: string,
  roomId?: string
): Promise<WishlistDTO[]> {
  let includeRoomShared = false;
  if (roomId) {
    try {
      const access = await getRoomAccess(roomId, userId);
      includeRoomShared = access.canRead;
    } catch {
      includeRoomShared = false;
    }
  }

  const whereClause =
    includeRoomShared && roomId
      ? or(
          eq(wishlists.ownerId, userId),
          and(eq(wishlists.roomId, roomId), eq(wishlists.visibility, 'ROOM'))
        )
      : eq(wishlists.ownerId, userId);

  const rows = await db
    .select({
      wishlist: wishlists,
      ownerUsername: users.username,
    })
    .from(wishlists)
    .leftJoin(users, eq(wishlists.ownerId, users.id))
    .where(whereClause)
    .orderBy(desc(wishlists.updatedAt));

  if (rows.length === 0) return [];

  const wishlistIds = rows.map((r) => r.wishlist.id);
  const itemKeysRows = await db
    .select({
      wishlistId: wishlistItems.wishlistId,
      canonicalKey: savedProblems.canonicalKey,
    })
    .from(wishlistItems)
    .innerJoin(savedProblems, eq(wishlistItems.problemId, savedProblems.id))
    .where(inArray(wishlistItems.wishlistId, wishlistIds))
    .orderBy(asc(wishlistItems.position), asc(wishlistItems.addedAt));

  const keysByWishlist = new Map<string, string[]>();
  for (const row of itemKeysRows) {
    const list = keysByWishlist.get(row.wishlistId);
    if (list) {
      list.push(row.canonicalKey);
    } else {
      keysByWishlist.set(row.wishlistId, [row.canonicalKey]);
    }
  }

  return rows.map(({ wishlist, ownerUsername }) => {
    const keys = keysByWishlist.get(wishlist.id) || [];
    return {
      id: wishlist.id,
      ownerId: wishlist.ownerId,
      ownerUsername: ownerUsername || undefined,
      roomId: wishlist.roomId,
      name: wishlist.name,
      description: wishlist.description,
      visibility: wishlist.visibility as WishlistVisibility,
      itemCount: keys.length,
      problemKeys: keys,
      isOwner: wishlist.ownerId === userId,
      createdAt: wishlist.createdAt.toISOString(),
      updatedAt: wishlist.updatedAt.toISOString(),
    };
  });
}

export async function getWishlistDetail(
  wishlistId: string,
  userId: string
): Promise<WishlistWithItemsDTO> {
  const { wishlist, ownerUsername } = await assertWishlistReadAccess(wishlistId, userId);

  const itemRows = await db
    .select({
      item: wishlistItems,
      problem: savedProblems,
    })
    .from(wishlistItems)
    .innerJoin(savedProblems, eq(wishlistItems.problemId, savedProblems.id))
    .where(eq(wishlistItems.wishlistId, wishlistId))
    .orderBy(asc(wishlistItems.position), asc(wishlistItems.addedAt));

  const items: WishlistItemDTO[] = itemRows.map(({ item, problem }) => ({
    id: item.id,
    wishlistId: item.wishlistId,
    problemId: item.problemId,
    canonicalKey: problem.canonicalKey,
    position: item.position,
    note: item.note,
    addedAt: item.addedAt.toISOString(),
    problem: mapSavedProblemToDTO(problem),
  }));

  return {
    id: wishlist.id,
    ownerId: wishlist.ownerId,
    ownerUsername,
    roomId: wishlist.roomId,
    name: wishlist.name,
    description: wishlist.description,
    visibility: wishlist.visibility as WishlistVisibility,
    itemCount: items.length,
    problemKeys: items.map((i) => i.canonicalKey),
    isOwner: wishlist.ownerId === userId,
    createdAt: wishlist.createdAt.toISOString(),
    updatedAt: wishlist.updatedAt.toISOString(),
    items,
  };
}

export async function createWishlist(
  userId: string,
  input: CreateWishlistInput
): Promise<WishlistDTO> {
  const visibility: WishlistVisibility = input.visibility || 'PRIVATE';
  let roomId: string | null = input.roomId || null;

  if (visibility === 'ROOM') {
    if (!roomId) {
      throw new AppError(
        'roomId is required when creating a room-shared wishlist',
        400,
        'VALIDATION_ERROR'
      );
    }
    const access = await getRoomAccess(roomId, userId);
    if (!access.canRead) {
      throw new AppError('Access denied to target workspace', 403, 'FORBIDDEN');
    }
  } else if (roomId) {
    const access = await getRoomAccess(roomId, userId);
    if (!access.canRead) {
      roomId = null;
    }
  }

  const [created] = await db
    .insert(wishlists)
    .values({
      ownerId: userId,
      roomId,
      name: input.name,
      description: input.description || null,
      visibility,
    })
    .returning();

  const [owner] = await db
    .select({ username: users.username })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  return {
    id: created.id,
    ownerId: created.ownerId,
    ownerUsername: owner?.username,
    roomId: created.roomId,
    name: created.name,
    description: created.description,
    visibility: created.visibility as WishlistVisibility,
    itemCount: 0,
    problemKeys: [],
    isOwner: true,
    createdAt: created.createdAt.toISOString(),
    updatedAt: created.updatedAt.toISOString(),
  };
}

export async function updateWishlist(
  wishlistId: string,
  userId: string,
  input: UpdateWishlistInput
): Promise<WishlistDTO> {
  const { wishlist, ownerUsername } = await assertWishlistReadAccess(wishlistId, userId);
  if (wishlist.ownerId !== userId) {
    throw new AppError('Only the wishlist owner can edit folder settings', 403, 'FORBIDDEN');
  }

  const nextVisibility = (input.visibility || wishlist.visibility) as WishlistVisibility;
  const nextRoomId = input.roomId !== undefined ? input.roomId : wishlist.roomId;

  if (nextVisibility === 'ROOM') {
    if (!nextRoomId) {
      throw new AppError(
        'roomId is required when sharing a wishlist with a room',
        400,
        'VALIDATION_ERROR'
      );
    }
    const access = await getRoomAccess(nextRoomId, userId);
    if (!access.canRead) {
      throw new AppError('Access denied to target workspace', 403, 'FORBIDDEN');
    }
  }

  const [updated] = await db
    .update(wishlists)
    .set({
      name: input.name !== undefined ? input.name : wishlist.name,
      description: input.description !== undefined ? input.description : wishlist.description,
      visibility: nextVisibility,
      roomId: nextRoomId,
      updatedAt: new Date(),
    })
    .where(eq(wishlists.id, wishlistId))
    .returning();

  const items = await db
    .select({ canonicalKey: savedProblems.canonicalKey })
    .from(wishlistItems)
    .innerJoin(savedProblems, eq(wishlistItems.problemId, savedProblems.id))
    .where(eq(wishlistItems.wishlistId, wishlistId));

  const problemKeys = items.map((i) => i.canonicalKey);

  return {
    id: updated.id,
    ownerId: updated.ownerId,
    ownerUsername,
    roomId: updated.roomId,
    name: updated.name,
    description: updated.description,
    visibility: updated.visibility as WishlistVisibility,
    itemCount: problemKeys.length,
    problemKeys,
    isOwner: true,
    createdAt: updated.createdAt.toISOString(),
    updatedAt: updated.updatedAt.toISOString(),
  };
}

export async function deleteWishlist(wishlistId: string, userId: string): Promise<void> {
  const { wishlist } = await assertWishlistReadAccess(wishlistId, userId);
  if (wishlist.ownerId !== userId) {
    throw new AppError('Only the wishlist owner can delete this folder', 403, 'FORBIDDEN');
  }
  await db.delete(wishlists).where(eq(wishlists.id, wishlistId));
}

type SavedProblemPayloadInput = NonNullable<AddWishlistItemInput['problem']>;

function toProblemData(input: SavedProblemPayloadInput): ProblemData {
  return {
    title: input.title,
    platform: input.platform,
    url: input.url ?? undefined,
    contestId: input.contestId ?? undefined,
    index: input.index ?? undefined,
    timeLimit: input.timeLimit ?? undefined,
    memoryLimit: input.memoryLimit ?? undefined,
    difficulty: input.difficulty ?? undefined,
    tags: input.tags ?? undefined,
    description: input.description ?? undefined,
    inputSpecification: input.inputSpecification ?? undefined,
    outputSpecification: input.outputSpecification ?? undefined,
    sampleInput: input.sampleInput ?? undefined,
    sampleOutput: input.sampleOutput ?? undefined,
    sampleCases: input.sampleCases
      ? input.sampleCases.map((c) => ({ input: c.input, output: c.output ?? undefined }))
      : undefined,
    codeSnippets: input.codeSnippets ?? undefined,
  };
}

export async function addItemToWishlist(
  wishlistId: string,
  userId: string,
  input: AddWishlistItemInput
): Promise<{ item: WishlistItemDTO; alreadyExists: boolean }> {
  await assertWishlistWriteAccess(wishlistId, userId);

  let resolvedProblem: ProblemData;
  if (input.problem) {
    resolvedProblem = toProblemData(input.problem);
  } else if (input.urlOrId) {
    resolvedProblem = await importProblem({
      urlOrId: input.urlOrId,
      platform: input.platform,
    });
  } else {
    throw new AppError('Either urlOrId or problem payload is required', 400, 'VALIDATION_ERROR');
  }

  const savedProblemRow = await upsertSavedProblem(resolvedProblem);

  return db.transaction(async (tx) => {
    const [existingItem] = await tx
      .select()
      .from(wishlistItems)
      .where(
        and(
          eq(wishlistItems.wishlistId, wishlistId),
          eq(wishlistItems.problemId, savedProblemRow.id)
        )
      )
      .limit(1);

    if (existingItem) {
      return {
        alreadyExists: true,
        item: {
          id: existingItem.id,
          wishlistId: existingItem.wishlistId,
          problemId: existingItem.problemId,
          canonicalKey: savedProblemRow.canonicalKey,
          position: existingItem.position,
          note: existingItem.note,
          addedAt: existingItem.addedAt.toISOString(),
          problem: mapSavedProblemToDTO(savedProblemRow),
        },
      };
    }

    const [maxPosRow] = await tx
      .select({ maxPos: sql<number>`coalesce(max(${wishlistItems.position}), -1)` })
      .from(wishlistItems)
      .where(eq(wishlistItems.wishlistId, wishlistId));

    const nextPosition = Number(maxPosRow?.maxPos ?? -1) + 1;

    const [created] = await tx
      .insert(wishlistItems)
      .values({
        wishlistId,
        problemId: savedProblemRow.id,
        position: nextPosition,
        note: input.note || null,
      })
      .returning();

    await tx
      .update(wishlists)
      .set({ updatedAt: new Date() })
      .where(eq(wishlists.id, wishlistId));

    return {
      alreadyExists: false,
      item: {
        id: created.id,
        wishlistId: created.wishlistId,
        problemId: created.problemId,
        canonicalKey: savedProblemRow.canonicalKey,
        position: created.position,
        note: created.note,
        addedAt: created.addedAt.toISOString(),
        problem: mapSavedProblemToDTO(savedProblemRow),
      },
    };
  });
}

export async function addItemsToWishlistBulk(
  wishlistId: string,
  userId: string,
  itemsInput: AddWishlistItemInput[]
): Promise<{ addedCount: number }> {
  await assertWishlistWriteAccess(wishlistId, userId);

  const resolvedEntries: Array<{
    problemRow: typeof savedProblems.$inferSelect;
    note: string | null;
  }> = [];

  for (const entry of itemsInput) {
    let resolvedProblem: ProblemData;
    if (entry.problem) {
      resolvedProblem = toProblemData(entry.problem);
    } else if (entry.urlOrId) {
      resolvedProblem = await importProblem({
        urlOrId: entry.urlOrId,
        platform: entry.platform,
      });
    } else {
      continue;
    }
    const problemRow = await upsertSavedProblem(resolvedProblem);
    resolvedEntries.push({ problemRow, note: entry.note || null });
  }

  if (resolvedEntries.length === 0) {
    return { addedCount: 0 };
  }

  return db.transaction(async (tx) => {
    const existingRows = await tx
      .select({ problemId: wishlistItems.problemId })
      .from(wishlistItems)
      .where(eq(wishlistItems.wishlistId, wishlistId));
    const existingSet = new Set(existingRows.map((r) => r.problemId));

    const [maxPosRow] = await tx
      .select({ maxPos: sql<number>`coalesce(max(${wishlistItems.position}), -1)` })
      .from(wishlistItems)
      .where(eq(wishlistItems.wishlistId, wishlistId));
    let nextPos = Number(maxPosRow?.maxPos ?? -1) + 1;

    let addedCount = 0;
    for (const { problemRow, note } of resolvedEntries) {
      if (existingSet.has(problemRow.id)) continue;
      existingSet.add(problemRow.id);
      await tx.insert(wishlistItems).values({
        wishlistId,
        problemId: problemRow.id,
        position: nextPos++,
        note,
      });
      addedCount++;
    }

    if (addedCount > 0) {
      await tx
        .update(wishlists)
        .set({ updatedAt: new Date() })
        .where(eq(wishlists.id, wishlistId));
    }

    return { addedCount };
  });
}

export async function removeItemFromWishlist(
  wishlistId: string,
  userId: string,
  opts: { itemId?: string; canonicalKey?: string }
): Promise<{ ok: boolean }> {
  await assertWishlistWriteAccess(wishlistId, userId);

  if (opts.itemId) {
    const [deleted] = await db
      .delete(wishlistItems)
      .where(
        and(eq(wishlistItems.id, opts.itemId), eq(wishlistItems.wishlistId, wishlistId))
      )
      .returning();

    if (!deleted) {
      throw new AppError('Wishlist item not found', 404, 'ITEM_NOT_FOUND');
    }
  } else if (opts.canonicalKey) {
    const [prob] = await db
      .select({ id: savedProblems.id })
      .from(savedProblems)
      .where(eq(savedProblems.canonicalKey, opts.canonicalKey))
      .limit(1);

    if (!prob) {
      return { ok: true };
    }

    await db
      .delete(wishlistItems)
      .where(
        and(
          eq(wishlistItems.wishlistId, wishlistId),
          eq(wishlistItems.problemId, prob.id)
        )
      );
  } else {
    throw new AppError('itemId or canonicalKey is required', 400, 'VALIDATION_ERROR');
  }

  await db
    .update(wishlists)
    .set({ updatedAt: new Date() })
    .where(eq(wishlists.id, wishlistId));

  return { ok: true };
}
