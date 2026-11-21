---
name: codev-context
description: Use at the start of any Codev build session to load full project context — stack decisions, working mode, folder layout, and where we left off.
---

# Codev Project Context

Load this at the start of every new Codev session so nothing needs to be re-explained.

---

## The Two Folders

**`/home/jarvis/Projects/GitHub/codev`**
- The GitHub project repo — this is where all code is written and pushed
- Personal portfolio project, built from scratch
- Uses pnpm workspaces (monorepo)
- GitHub remote: https://github.com/RaviPandey2002/codev.git

**`/home/jarvis/Projects/GitHub/Notes/antigravity-notes/codev`**
- The engineering knowledge base and revision vault
- Contains all architectural decisions, docs, weekly digests, and concepts
- Read from here, write code to `codev/`

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

---

## Strict Git Rule
- **NEVER run `git commit` or `git push` autonomously.**
- All changes must be left uncommitted in the working tree for the user to review with `git status` and `git diff`.
- Always provide a recommended conventional commit message in the response for the user to commit and push on their own.
