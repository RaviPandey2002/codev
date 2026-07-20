import { pgTable, uuid, text, timestamp, customType } from 'drizzle-orm/pg-core'

const bytea = customType<{ data: Buffer }>({
  dataType() { return 'bytea' },
})

export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  username: text('username').notNull().unique(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull()
});

export const rooms = pgTable('rooms', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  ownerId: uuid('owner_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at').defaultNow().notNull()
});

// Room members (junction table)
export const roomMembers = pgTable('room_members', {
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  roomId: uuid('room_id').notNull().references(() => rooms.id, { onDelete: "cascade" }),
  joinedAt: timestamp('joined_at').defaultNow().notNull()
});

export const messages = pgTable('messages', {
  id:        uuid('id').defaultRandom().primaryKey(),
  roomId:    uuid('room_id').notNull().references(() => rooms.id, { onDelete: 'cascade' }),
  userId:    uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  text:      text('text').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

export const yjsSnapshots = pgTable('yjs_snapshots', {
  roomId:    uuid('room_id').primaryKey().references(() => rooms.id, { onDelete: 'cascade' }),
  snapshot:  bytea('snapshot').notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

export const refreshTokens = pgTable('refresh_tokens', {
  id:        uuid('id').defaultRandom().primaryKey(),
  userId:    uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  tokenHash: text('token_hash').notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})