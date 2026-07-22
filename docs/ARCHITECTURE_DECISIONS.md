# Architecture Decisions
## Codev — Real-Time Collaborative Code Editor

The decisions below shaped the entire stack. Each one has a reason — not "it's popular" but a specific tradeoff that mattered for this project.

---

### Why Vite + React, not Next.js

A collaborative editor is client-owned by nature. The Yjs document, the WebSocket connection, the CodeMirror view — all of it lives on the client and stays alive for the duration of a session. Next.js is built around the idea that the server controls rendering and its API routes are serverless functions that die after each response. A persistent WebSocket connection that needs to stay open for an hour is fundamentally incompatible with that model. Vite produces a plain SPA served statically. The client connects to the backend over HTTP and WebSocket independently. That's the right fit.

---

### Why CodeMirror 6, not Monaco

Monaco is the VS Code engine. It's excellent but it ships at ~5 MB and assumes a desktop IDE context. CodeMirror 6 was a complete rewrite with a modular extension architecture — you include exactly what you need, and the bundle stays under 200 KB. The deciding factor was `y-codemirror.next`, the official Yjs binding maintained by the CodeMirror author himself. It wires two-way sync, cursor presence, and collaborative undo into a single function call. Monaco's Yjs binding is community-maintained and much less active. Given that real-time sync is the core feature, having the official binding was the only reasonable choice.

---

### Why Yjs (CRDT), not ShareDB (OT)

Operational Transformation requires a central server that serialises and transforms every operation. The server has to understand the document format to do that transformation — it can't just relay bytes. That creates a stateful bottleneck that's hard to scale horizontally. With Yjs, the server is a dumb relay. It receives a binary update blob and broadcasts it to other clients without needing to understand what's in it. Adding a second server instance is just a matter of adding Redis Pub/Sub between them. Beyond scaling, Yjs handles offline edits natively — clients merge on reconnect without any server involvement. OT falls apart in that scenario.

---

### Why Fastify, not Express

The honest reason is TypeScript integration. Express TypeScript support is bolted on — you manually annotate request bodies and params and hope they match. Fastify is designed TypeScript-first. You define a JSON Schema for a route and the types are inferred automatically. It also validates all request bodies via `ajv` before the handler ever runs, which eliminates an entire category of bugs. The other reason is `@fastify/websocket` — it's maintained by the Fastify core team and integrates WebSocket routes directly into Fastify's routing and lifecycle system. Auth middleware (`preHandler` hooks) works identically on HTTP and WebSocket routes. One server, one port, one auth model.

---

### Why PostgreSQL + Drizzle, not MongoDB + Prisma

The data model is relational. Users own rooms, rooms have members, messages belong to rooms and users. MongoDB can represent this but you end up emulating joins manually and losing referential integrity. PostgreSQL enforces foreign keys and handles the `bytea` column type natively — which is exactly what you need for storing Yjs binary snapshots without encoding overhead. Drizzle over Prisma comes down to one thing: Drizzle generates real SQL migration files you read and approve before applying. Prisma's generated client is a black box. For a project where understanding the database layer is part of the point, Drizzle keeps you close to what's actually happening.

---

### Why JWT + refresh tokens, not sessions

The WebSocket auth story is cleaner with JWTs. When a client opens a WebSocket connection, it sends the access token in the cookie on the HTTP upgrade request. The server verifies it once, the connection is established, and the socket stays open. With sessions you'd need to re-validate the session on every message or deal with session expiry mid-connection. The tradeoff is that JWTs can't be instantly revoked — but a 15-minute access token TTL is an acceptable window for a code editor. The refresh token stored in the database gives full revocation control: delete the row and the user is locked out within 15 minutes. Both tokens live in `httpOnly` cookies, not `localStorage`, so they're not accessible to JavaScript and aren't vulnerable to XSS.

---

### Why TypeScript end-to-end

The `shared/` package is the reason. Both `client/` and `server/` import the same TypeScript types — WebSocket message shapes, API response types, room and user DTOs — from one place. When the server changes a response shape, the frontend gets a compile error immediately. Without TypeScript end-to-end, those types would have to be copy-pasted and manually kept in sync, and drift between them only shows up as a runtime bug. The other reason is the WebSocket protocol itself. Without typed discriminated unions for message types, a missing `case` in a switch statement is a silent runtime bug. With TypeScript, it's a compile error.
