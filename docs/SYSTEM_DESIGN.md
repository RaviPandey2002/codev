# System Design
## Codev — Real-Time Collaborative Code Editor
**Version:** 1.0

---

## 1. High-Level Architecture

```
┌──────────────────────────────────────────────────────────────────────────┐
│                               BROWSER                                    │
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────────┐ │
│  │                        React SPA (Vite)                             │ │
│  │                                                                     │ │
│  │  ┌──────────────────────┐   ┌──────────────────────────────────┐   │ │
│  │  │   Auth / Lobby       │   │      Editor Workspace            │   │ │
│  │  │   Pages              │   │                                  │   │ │
│  │  │   - /login           │   │  ┌────────────────────────────┐  │   │ │
│  │  │   - /register        │   │  │  CodeMirror 6 EditorView   │  │   │ │
│  │  │   - /dashboard       │   │  │  + yCollab extension       │  │   │ │
│  │  └──────────┬───────────┘   │  │  + syntax highlighting     │  │   │ │
│  │             │ HTTP REST     │  └─────────────┬──────────────┘  │   │ │
│  │             │               │                │ Yjs updates     │   │ │
│  │             │               │  ┌─────────────▼──────────────┐  │   │ │
│  │             │               │  │  WebsocketProvider         │  │   │ │
│  │             │               │  │  (y-websocket client)      │  │   │ │
│  │             │               │  └─────────────┬──────────────┘  │   │ │
│  │             │               │                │ WS /room/:id    │   │ │
│  │             │               └────────────────┼─────────────────┘   │ │
│  └─────────────┼───────────────────────────────-┼─────────────────────┘ │
└────────────────┼────────────────────────────────┼───────────────────────┘
                 │ HTTPS                          │ WSS
               ▼                              ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                         FASTIFY API SERVER                               │
│                                                                          │
│  ┌─────────────────────────────┐   ┌──────────────────────────────────┐  │
│  │       REST Routes           │   │    @fastify/websocket Handler    │  │
│  │                             │   │    WS /room/:id                  │  │
│  │  POST /auth/register        │   │                                  │  │
│  │  POST /auth/login           │   │  ┌────────────────────────────┐  │  │
│  │  POST /auth/refresh         │   │  │   y-websocket provider     │  │  │
│  │  POST /auth/logout          │   │  │   - Yjs sync (binary)      │  │  │
│  │  GET  /rooms                │   │  │   - awareness relay        │  │  │
│  │  POST /rooms                │   │  └────────────────────────────┘  │  │
│  │  GET  /rooms/:id            │   │                                  │  │
│  │  DELETE /rooms/:id          │   │  ┌────────────────────────────┐  │  │
│  │  GET  /users/me             │   │  │   Chat handler (JSON)      │  │  │
│  │                             │   │  │   - receive chat message   │  │  │
│  │  [preHandler: verifyJWT]    │   │  │   - persist to Postgres    │  │  │
│  └──────────────┬──────────────┘   │  │   - broadcast to room      │  │  │
│                 │                  │  └────────────────────────────┘  │  │
│                 │                  └────────────────┬─────────────────┘  │
│                 │                                   │                    │
└─────────────────┼───────────────────────────────────┼────────────────────┘
                  │                                   │
        ┌─────────▼──────────┐           ┌────────────▼────────────┐
        │   PostgreSQL 16    │           │       Redis 7            │
        │                    │           │                          │
        │  users             │           │  Pub/Sub:                │
        │  rooms             │           │   channel: room:{id}     │
        │  room_members      │           │   (inter-instance relay) │
        │  messages          │           │                          │
        │  yjs_snapshots     │           │  Rate limit counters     │
        │  refresh_tokens    │           └──────────────────────────┘
        └────────────────────┘
```

---

## 2. Request Flows

### 2.1 User Login

```
Browser                     Fastify                  PostgreSQL
   │                           │                         │
   │── POST /auth/login ───────►│                         │
   │   { email, password }     │── SELECT user ──────────►│
   │                           │◄── user row ─────────────│
   │                           │                         │
   │                           │  verify bcrypt hash     │
   │                           │                         │
   │                           │── INSERT refresh_token ─►│
   │                           │◄── ok ──────────────────│
   │                           │                         │
   │                           │  sign JWT (15 min)      │
   │                           │                         │
   │◄── 200 + Set-Cookie ──────│
   │   access_token (httpOnly) │
   │   refresh_token (httpOnly)│
```

---

### 2.2 Create Room and Open Editor

```
Browser                     Fastify                  PostgreSQL
   │                           │                         │
   │── POST /rooms ────────────►│                         │
   │   { name: "Apollo-X" }    │  verify JWT             │
   │                           │── INSERT room ──────────►│
   │                           │◄── room row ─────────────│
   │◄── 201 { id, name } ──────│                         │
   │                           │                         │
   │  (navigate to /room/:id)  │                         │
   │                           │                         │
   │── WS UPGRADE /room/:id ──►│                         │
   │   Cookie: access_token    │  verify JWT             │
   │                           │  check room exists      │
   │                           │── SELECT yjs_snapshot ──►│
   │                           │◄── snapshot (or null) ───│
   │                           │                         │
   │                           │  init Yjs doc           │
   │◄── 101 Switching Protocols│                         │
   │                           │                         │
   │◄── Yjs Sync Step 2 ───────│  (send full doc state)  │
   │   (binary frame)          │                         │
   │                           │                         │
   │  (editor renders content) │                         │
```

---

### 2.3 Real-Time Edit — Two Users

```
User A (Browser)         Fastify WS Server         User B (Browser)
     │                         │                         │
     │  type "hello" ─────────►│                         │
     │  (Yjs update, binary)   │                         │
     │                         │  apply to server doc    │
     │                         │── broadcast ────────────►│
     │                         │   (binary frame)        │
     │                         │                         │  CodeMirror
     │                         │                         │  patches view
     │                         │                         │
     │  (30s timer)            │                         │
     │                         │── UPDATE yjs_snapshots ─►│ (Postgres)
     │                         │   SET snapshot = ...    │
```

---

### 2.4 User Sends Chat Message

```
User A (Browser)         Fastify WS Server     PostgreSQL     User B (Browser)
     │                         │                   │                │
     │── { type:"chat",        │                   │                │
     │    payload:{text:"hi"} }│                   │                │
     │                         │  INSERT message ──►│                │
     │                         │◄── ok ─────────────│                │
     │                         │── broadcast ────────────────────────►│
     │◄── chat-message ────────│   { type:"chat-message", ... }      │
```

---

## 3. WebSocket Connection Lifecycle

```
Client connects
     │
     ├─ preHandler: verify JWT
     │       └─ invalid → close(4001)
     │
     ├─ check room exists
     │       └─ not found → close(4004)
     │
     ├─ load Yjs snapshot from DB (if exists)
     │
     ├─ register client in room's peer set
     │
     ├─ send Sync Step 2 (full doc state)
     │
     ├─ send chat history (last 50 messages)
     │
     ├─ broadcast system event "join" to other peers
     │
     │   ← messages flowing (Yjs updates, awareness, chat) →
     │
     │
Client disconnects
     │
     ├─ remove from peer set
     ├─ broadcast system event "leave"
     ├─ if room is now empty → persist Yjs snapshot to DB
     └─ done
```

---

## 4. Scaling Model

### Single Instance (Development)

```
[Vite dev server :5173]   →   [Fastify :3000]   →   [Postgres :5432]
                                                  →   [Redis :6379]
```

All WebSocket clients connect to the same Fastify instance. No cross-instance relay needed. Redis is used for rate limiting only.

---

### Multi-Instance (Production)

```
                    ┌─────────────────┐
                    │  Load Balancer  │  (nginx / cloud LB)
                    │  sticky session │
                    └────────┬────────┘
                             │
             ┌───────────────┼──────────────────┐
             ▼               ▼                  ▼
       [Fastify :3000]  [Fastify :3000]   [Fastify :3000]
        Instance A       Instance B        Instance C
             │               │                  │
             └───────────────▼──────────────────┘
                         Redis Pub/Sub
                      channel: room:{id}
                             │
                       ┌─────▼──────┐
                       │ PostgreSQL │
                       │  (primary) │
                       └────────────┘
```

**How the relay works:**
- User A is on Instance A, User B is on Instance B, both in room `XRX-772`
- User A sends a Yjs update to Instance A
- Instance A applies it to its local Yjs doc and publishes the update to Redis channel `room:XRX-772`
- Instance B is subscribed to `room:XRX-772` — it receives the update and broadcasts it to User B
- Result: User B sees the update as if they were on the same server

---

## 5. Authentication Flow — Token Lifecycle

```
                  ┌────────────────────────────────────────┐
                  │              BROWSER                   │
                  │                                        │
                  │  access_token cookie  (15 min)         │
                  │  refresh_token cookie (7 days)         │
                  │                                        │
                  │  Timer: 14 min after login             │
                  │  → silently POST /auth/refresh         │
                  │  → new access_token set in cookie      │
                  │  → old refresh_token rotated           │
                  │                                        │
                  │  On any 401 response:                  │
                  │  → attempt one token refresh           │
                  │  → if refresh fails → redirect /login  │
                  └────────────────────────────────────────┘
```

---

## 6. Security Boundaries

| Boundary | Control |
|----------|---------|
| All HTTP | HTTPS enforced in production (TLS termination at load balancer) |
| All cookies | `httpOnly`, `SameSite=Strict`, `Secure` in production |
| REST routes | JWT verified in `preHandler` hook before any handler runs |
| WS upgrade | JWT verified in `preHandler` before the upgrade is accepted |
| Passwords | bcrypt hash, cost factor 12 — never logged or returned |
| Refresh tokens | Stored as SHA-256 hash in DB — raw token only in cookie |
| Rate limiting | `/auth/login` and `/auth/register`: 10 req/min per IP via Redis counter |
| Response headers | `@fastify/helmet` sets `X-Frame-Options`, `X-Content-Type-Options`, CSP, etc. |
| Input validation | All request bodies validated via Fastify JSON Schema before handler runs |

---

## 7. Environment Variables

```
# Backend — required
DATABASE_URL=postgresql://user:password@localhost:5432/codev
REDIS_URL=redis://localhost:6379
JWT_SECRET=minimum-32-character-random-string
JWT_REFRESH_SECRET=different-minimum-32-character-string
NODE_ENV=development

# Backend — optional
PORT=3000
CORS_ORIGIN=http://localhost:5173
SNAPSHOT_INTERVAL_MS=30000   # Yjs snapshot save interval (default 30s)

# Frontend
VITE_API_URL=http://localhost:3000
VITE_WS_URL=ws://localhost:3000
```
