# Codev

A real-time collaborative code editor built with React, Yjs, and Fastify.

> **Status:** Work in progress — actively being built.

---

## What It Is

Codev lets multiple users write and edit code together in a shared workspace called a room. Every keystroke is synced instantly across all participants — no conflicts, no manual refresh, no last-write-wins.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + TypeScript + Vite |
| UI | shadcn/ui + Tailwind CSS |
| Code Editor | CodeMirror 6 |
| Real-time Sync | Yjs (CRDT) |
| Backend | Fastify + TypeScript |
| Database | PostgreSQL + Drizzle ORM |
| Cache / Pub-Sub | Redis |
| Auth | JWT + refresh token rotation |
| DevOps | Docker Compose + GitHub Actions |

---

## Project Structure

```
codev/
├── client/     # React + Vite frontend
├── server/     # Fastify API + WebSocket server
└── shared/     # Shared TypeScript types
```

---

## Planned Features

- Multi-user real-time editing with CRDT-based conflict resolution
- Named cursors — see where each collaborator is in the document
- Room management — create, share, and persist coding sessions
- In-room chat
- Syntax highlighting for JavaScript, TypeScript, Python and more
- Horizontally scalable via Redis Pub/Sub

---

*More documentation will be added as the project progresses.*
