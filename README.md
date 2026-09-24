# Codev

A real-time collaborative code editor and competitive programming workspace built with React, Monaco Editor, Yjs, and Fastify.

## Features

- **Real-Time Collaboration** — Conflict-free multiplayer editing powered by Yjs CRDTs and binary WebSockets, with live cursor presence and selection awareness.
- **Monaco IDE Experience** — Full-featured code editor with syntax highlighting for TypeScript, JavaScript, C++, C, Python, and React (JSX).
- **Instant Workspaces** — Spin up scratchpads or competitive programming rooms from pre-configured language templates and share via invite codes.
- **Role-Based Access Control** — Public and private workspaces supporting `OWNER`, `EDITOR`, and `VIEWER` permissions.
- **Persistent State** — Debounced binary CRDT snapshot persistence to PostgreSQL.
- **Authentication** — JWT access tokens with `httpOnly` refresh token rotation.

## Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 19, TypeScript, Vite, Tailwind CSS v4, shadcn/ui, Zustand |
| **Editor & Sync** | Monaco Editor, Yjs, `y-monaco`, `y-websocket` |
| **Backend** | Fastify, `@fastify/websocket`, TypeScript, Zod |
| **Database & Cache** | PostgreSQL 16, Drizzle ORM, Redis 7 |
| **Infrastructure** | pnpm Workspaces, Docker Compose |

## Project Structure

```text
codev/
├── client/     # React + Vite frontend (@codev/client)
├── server/     # Fastify REST + WebSocket server (@codev/server)
├── shared/     # Shared TypeScript types & Zod schemas (@codev/shared)
└── docs/       # Architecture, data model, and API specifications
```

## Getting Started

### Prerequisites

- **Node.js** >= 20
- **pnpm** >= 11
- **Docker** & **Docker Compose**

### Setup

1. **Install dependencies**

   ```bash
   pnpm install
   ```

2. **Start PostgreSQL and Redis**

   ```bash
   docker compose up -d
   ```

3. **Configure environment variables**

   Create `server/.env`:

   ```env
   PORT=3007
   NODE_ENV=development
   CLIENT_URL=http://localhost:5173
   DATABASE_URL=postgresql://dev:codev@localhost:5432/codev
   JWT_SECRET=your-jwt-secret
   COOKIE_SECRET=your-cookie-secret
   ```

4. **Run database migrations**

   ```bash
   pnpm --filter @codev/server db:migrate
   ```

5. **Start the development servers**

   ```bash
   pnpm dev
   ```

   - **Client:** `http://localhost:5173`
   - **Server:** `http://localhost:3007`

## Scripts

| Command | Description |
|---|---|
| `pnpm dev` | Start client and server in development mode |
| `pnpm build` | Build all workspace packages |
| `pnpm typecheck` | Run TypeScript type checks across the monorepo |
| `pnpm lint` | Run ESLint across the monorepo |
| `pnpm --filter @codev/server db:generate` | Generate Drizzle SQL migrations |
| `pnpm --filter @codev/server db:migrate` | Apply database migrations |

## Documentation

Detailed technical documentation is available in [`docs/`](./docs):

- [System Design](./docs/SYSTEM_DESIGN.md)
- [Data Model](./docs/DATA_MODEL.md)
- [API Contract](./docs/API_CONTRACT.md)
- [Architecture Decisions](./docs/ARCHITECTURE_DECISIONS.md)

## License

[MIT](./LICENSE)
