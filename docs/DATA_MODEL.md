# Data Model
## Codev — Real-Time Collaborative Code Editor
**Version:** 1.0 · **Database:** PostgreSQL 16 · **ORM:** Drizzle ORM

---

## Entity Relationship Diagram

```
┌──────────────────────┐         ┌──────────────────────────┐
│        users         │         │         rooms             │
├──────────────────────┤         ├──────────────────────────┤
│ id          UUID  PK │◄───┐    │ id          UUID      PK │
│ email       TEXT     │    │    │ name        TEXT          │
│ username    TEXT     │    └────│ owner_id    UUID      FK  │
│ password_hash TEXT   │         │ created_at  TIMESTAMPTZ  │
│ created_at  TSTZ     │         └──────────┬───────────────┘
└──────────┬───────────┘                    │
           │                               │
           │  ┌────────────────────────────┘
           │  │
           │  │    ┌──────────────────────────┐
           │  │    │      yjs_snapshots        │
           │  │    ├──────────────────────────┤
           │  └───►│ room_id   UUID        PK │
           │       │           FK → rooms.id  │
           │       │ snapshot  BYTEA          │
           │       │ updated_at TSTZ          │
           │       └──────────────────────────┘
           │
           │       ┌──────────────────────────┐
           │       │        messages           │
           │       ├──────────────────────────┤
           └──────►│ id          UUID       PK │
                   │ room_id  UUID          FK │
                   │ user_id  UUID          FK │
                   │ text     TEXT             │
                   │ created_at TSTZ           │
                   └──────────────────────────┘

           ┌──────────────────────────────────┐
           │          refresh_tokens           │
           ├──────────────────────────────────┤
           │ id          UUID              PK  │
           │ user_id     UUID              FK  │
           │ token_hash  TEXT                  │
           │ expires_at  TSTZ                  │
           │ created_at  TSTZ                  │
           └──────────────────────────────────┘

           ┌──────────────────────────────────┐
           │          room_members             │
           ├──────────────────────────────────┤
           │ room_id     UUID              FK  │
           │ user_id     UUID              FK  │
           │ joined_at   TSTZ                  │
           │ PRIMARY KEY (room_id, user_id)    │
           └──────────────────────────────────┘
```

---

## Table Definitions

### `users`

Stores registered accounts.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | `UUID` | PK, default `gen_random_uuid()` | Stable identifier |
| `email` | `TEXT` | NOT NULL, UNIQUE | Lowercased on insert |
| `username` | `TEXT` | NOT NULL, UNIQUE | Shown in cursors and chat |
| `password_hash` | `TEXT` | NOT NULL | bcrypt hash, cost 12 |
| `created_at` | `TIMESTAMPTZ` | NOT NULL, default `now()` | — |

---

### `refresh_tokens`

Stores active refresh tokens. One row per active session.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | `UUID` | PK | — |
| `user_id` | `UUID` | NOT NULL, FK → `users.id` ON DELETE CASCADE | — |
| `token_hash` | `TEXT` | NOT NULL, UNIQUE | SHA-256 hash of the raw token |
| `expires_at` | `TIMESTAMPTZ` | NOT NULL | 7 days from creation |
| `created_at` | `TIMESTAMPTZ` | NOT NULL, default `now()` | — |

> **Security note:** The raw refresh token is stored only in the cookie. The database stores only a SHA-256 hash. If the DB is compromised, tokens cannot be used directly.

---

### `rooms`

A named collaborative workspace.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | `UUID` | PK | Generated UUID |
| `name` | `TEXT` | NOT NULL | User-provided project name, max 64 chars |
| `owner_id` | `UUID` | NOT NULL, FK → `users.id` ON DELETE SET NULL | Creator of the room |
| `created_at` | `TIMESTAMPTZ` | NOT NULL, default `now()` | — |

---

### `room_members`

Junction table — records every user who has ever joined a room. Used to build the "Recent Rooms" list.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `room_id` | `UUID` | PK (composite), FK → `rooms.id` ON DELETE CASCADE | — |
| `user_id` | `UUID` | PK (composite), FK → `users.id` ON DELETE CASCADE | — |
| `joined_at` | `TIMESTAMPTZ` | NOT NULL, default `now()` | First time user joined |

---

### `yjs_snapshots`

Stores the binary Yjs document state for each room.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `room_id` | `UUID` | PK, FK → `rooms.id` ON DELETE CASCADE | One snapshot per room |
| `snapshot` | `BYTEA` | NOT NULL | `Y.encodeStateAsUpdate(doc)` output |
| `updated_at` | `TIMESTAMPTZ` | NOT NULL, default `now()` | Updated every 30s or on room empty |

> **Why `BYTEA` and not base64?** A `BYTEA` column stores raw binary directly in Postgres without any encoding overhead. Yjs state vectors are already compact binary — encoding them as base64 would inflate storage by ~33% for no benefit.

---

### `messages`

Chat messages for each room.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | `UUID` | PK, default `gen_random_uuid()` | — |
| `room_id` | `UUID` | NOT NULL, FK → `rooms.id` ON DELETE CASCADE | — |
| `user_id` | `UUID` | NOT NULL, FK → `users.id` ON DELETE SET NULL | — |
| `text` | `TEXT` | NOT NULL | Max 2000 characters — enforced in app layer |
| `created_at` | `TIMESTAMPTZ` | NOT NULL, default `now()` | — |

---

## Indexes

```sql
-- Fast lookup for login
CREATE UNIQUE INDEX idx_users_email ON users (lower(email));

-- Refresh token lookup by hash (used on every token refresh)
CREATE UNIQUE INDEX idx_refresh_tokens_hash ON refresh_tokens (token_hash);

-- Clean up expired tokens efficiently
CREATE INDEX idx_refresh_tokens_expires_at ON refresh_tokens (expires_at);

-- Chat history for a room (loaded on join)
CREATE INDEX idx_messages_room_created
  ON messages (room_id, created_at DESC);
```

---

## Key Queries

### Dashboard — Recent rooms for a user
```sql
SELECT r.id, r.name, r.owner_id, rm.joined_at
FROM rooms r
JOIN room_members rm ON rm.room_id = r.id
WHERE rm.user_id = $1
ORDER BY rm.joined_at DESC
LIMIT 10;
```

### Chat — Load last 50 messages on join
```sql
SELECT m.id, m.text, m.created_at, u.username
FROM messages m
JOIN users u ON u.id = m.user_id
WHERE m.room_id = $1
ORDER BY m.created_at DESC
LIMIT 50;
-- Client reverses to display oldest → newest
```

### Auth — Validate refresh token
```sql
SELECT rt.id, rt.user_id, rt.expires_at
FROM refresh_tokens rt
WHERE rt.token_hash = $1
  AND rt.expires_at > now();
```

---

## Drizzle Schema

```typescript
// server/src/db/schema.ts (abbreviated)
import { pgTable, uuid, text, bytea, timestamp } from 'drizzle-orm/pg-core'

export const users = pgTable('users', {
  id:           uuid('id').defaultRandom().primaryKey(),
  email:        text('email').notNull().unique(),
  username:     text('username').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  createdAt:    timestamp('created_at').defaultNow().notNull(),
})

export const rooms = pgTable('rooms', {
  id:        uuid('id').defaultRandom().primaryKey(),
  name:      text('name').notNull(),
  ownerId:   uuid('owner_id').references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

export const yjsSnapshots = pgTable('yjs_snapshots', {
  roomId:    uuid('room_id').primaryKey().references(() => rooms.id, { onDelete: 'cascade' }),
  snapshot:  bytea('snapshot').notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

export const messages = pgTable('messages', {
  id:        uuid('id').defaultRandom().primaryKey(),
  roomId:    uuid('room_id').notNull().references(() => rooms.id, { onDelete: 'cascade' }),
  userId:    uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
  text:      text('text').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})
```
