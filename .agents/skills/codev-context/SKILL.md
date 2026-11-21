---
name: codev-context
description: Use at the start of any Codev build session to load full project context — stack decisions, working mode, folder layout, and where we left off.
---

# Codev Project Context

Load this at the start of every new Codev session so nothing needs to be re-explained.

---

## Project Repositories & Knowledge Base

**Codev Monorepo (`codev/`)**
- The primary GitHub project repository — all application code is written and deployed from here
- Production-grade collaborative editor and competitive programming arena built from scratch
- Managed via `pnpm` workspaces (monorepo)
- GitHub Remote: `https://github.com/RaviPandey2002/codev.git`

**Engineering Knowledge Base & Revision Vault (`antigravity-notes/codev/`)**
- Architecture decision records (ADRs), system design documents, weekly digests, and concepts
- Serves as the reference vault for architectural rationale and deep technical mastery

---

## What Codev Is

A production-grade, real-time collaborative code editor and competitive programming arena. Multiple users edit the same document simultaneously via CRDT-based sync. No conflicts, no last-write-wins, no refresh needed.

---

## All 7 Architectural Decisions — Locked

| # | Decision | Choice |
|---|----------|--------|
| 1 | Frontend Framework | React 19 + TypeScript, Vite SPA (not Next.js) |
| 2 | Code Editor | Monaco Editor (`y-monaco` binding) |
| 3 | Sync Algorithm | Yjs (CRDT) — `yjs` + `y-monaco` + `y-websocket` |
| 4 | Backend Framework | Fastify 4 + TypeScript + `@fastify/websocket` |
| 5 | Database | PostgreSQL + Drizzle ORM |
| 6 | Auth | JWT access token (15min, httpOnly cookie) + refresh token (7 days, DB-stored) |
| 7 | Language | TypeScript 7 end-to-end |

UI: shadcn/ui (Radix UI, New York preset) + Tailwind CSS v4 + Lucide icons + JetBrains Mono / Geist font  
Cache/Pub-Sub: Redis 7 (WebSocket horizontal scaling + rate limiting)  
DevOps: Docker Compose → GitHub Actions CI → Railway or Fly.io  

---

## Monorepo Structure

```
codev/
├── client/           → React + Vite SPA
│   ├── src/
│   │   ├── pages/         → Route-level page components (RoomPage, DashboardPage, etc.)
│   │   ├── components/    → Specialized room columns, modlas, icons
│   │   ├── hooks/         → Custom React hooks (useRoomWorkspace, etc.)
│   │   └── lib/           → utilities (cn, API client, WS setup)
├── server/           → Fastify API + WebSocket server
│   └── src/
│       ├── index.ts       → Fastify bootstrap
│       ├── services/      → execution.service, rooms.service, problems.service
│       ├── routes/        → auth, rooms, problems, execution, ws
│       └── db/            → Drizzle schema & migrations
├── shared/           → Shared TypeScript types (WSMessage, RoomDTO, UserDTO, TestCase)
├── docs/             → SYSTEM_DESIGN, API_CONTRACT, DATA_MODEL, ARCHITECTURE_DECISIONS
└── package.json      → Root pnpm workspace coordinator
```
