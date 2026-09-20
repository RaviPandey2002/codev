import { sql } from 'drizzle-orm';
import {
  pgTable,
  uuid,
  text,
  varchar,
  boolean,
  timestamp,
  customType,
  pgEnum,
  uniqueIndex,
  index,
} from 'drizzle-orm/pg-core';

const bytea = customType<{ data: Buffer }>({
  dataType() {
    return 'bytea';
  },
});

export const roomSourceEnum = pgEnum('room_source', [
  'SCRATCHPAD',
  'COMPILER',
  'GITHUB',
  'TEMPLATE',
]);

export const roomRoleEnum = pgEnum('room_role', ['OWNER', 'EDITOR', 'VIEWER']);

export const users = pgTable(
  'users',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    username: text('username').notNull(),
    email: text('email').notNull().unique(),
    passwordHash: text('password_hash').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [uniqueIndex('users_username_lower_idx').on(sql`lower(${table.username})`)]
);

export const rooms = pgTable('rooms', {
  id: varchar('id', { length: 21 }).primaryKey(),
  name: varchar('name', { length: 100 }).notNull(),
  description: text('description'),
  sourceType: roomSourceEnum('source_type').default('SCRATCHPAD').notNull(),
  githubRepo: varchar('github_repo', { length: 255 }),
  githubBranch: varchar('github_branch', { length: 100 }),
  isPrivate: boolean('is_private').default(false).notNull(),
  ownerId: uuid('owner_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const roomMembers = pgTable(
  'room_members',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    roomId: varchar('room_id', { length: 21 })
      .notNull()
      .references(() => rooms.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    role: roomRoleEnum('role').default('EDITOR').notNull(),
    joinedAt: timestamp('joined_at').defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('room_members_room_user_idx').on(table.roomId, table.userId),
    index('room_members_user_id_idx').on(table.userId),
  ]
);

export const roomFiles = pgTable(
  'room_files',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    roomId: varchar('room_id', { length: 21 })
      .notNull()
      .references(() => rooms.id, { onDelete: 'cascade' }),
    path: varchar('path', { length: 500 }).notNull(),
    content: text('content').default('').notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('room_files_room_path_idx').on(table.roomId, table.path),
    index('room_files_room_id_idx').on(table.roomId),
  ]
);

export const messages = pgTable('messages', {
  id: uuid('id').defaultRandom().primaryKey(),
  roomId: varchar('room_id', { length: 21 })
    .notNull()
    .references(() => rooms.id, { onDelete: 'cascade' }),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  text: text('text').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const yjsSnapshots = pgTable('yjs_snapshots', {
  roomId: varchar('room_id', { length: 21 })
    .primaryKey()
    .references(() => rooms.id, { onDelete: 'cascade' }),
  snapshot: bytea('snapshot').notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const refreshTokens = pgTable(
  'refresh_tokens',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    tokenHash: text('token_hash').notNull(),
    expiresAt: timestamp('expires_at').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('refresh_tokens_token_hash_idx').on(table.tokenHash),
    index('refresh_tokens_user_id_idx').on(table.userId),
  ]
);