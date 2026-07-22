# API Contract
## Codev — Real-Time Collaborative Code Editor
**Version:** 1.0
**Base URL:** `https://api.codev.dev` (production) · `http://localhost:3000` (local)
**Auth:** Cookie-based — `access_token` (`httpOnly`, `SameSite=Strict`) sent automatically by the browser on every request.

---

## Conventions

- All request and response bodies are `application/json`
- Dates are ISO 8601 strings: `"2025-01-15T14:32:00.000Z"`
- IDs are UUIDs
- Error shape is always: `{ "error": { "code": "SNAKE_CASE_CODE", "message": "Human readable message" } }`
- HTTP status codes follow REST conventions

---

## Auth Endpoints

### `POST /auth/register`
Register a new account.

**Request body:**
```json
{
  "email": "ravi@example.com",
  "username": "ravipandey",
  "password": "minimum8chars"
}
```

**Responses:**

`201 Created` — account created, tokens set in cookies
```json
{
  "user": {
    "id": "uuid",
    "email": "ravi@example.com",
    "username": "ravipandey",
    "createdAt": "2025-01-15T10:00:00.000Z"
  }
}
```

`409 Conflict` — email or username already registered
```json
{ "error": { "code": "EMAIL_TAKEN", "message": "An account with this email already exists." } }
```

`422 Unprocessable Entity` — validation failed
```json
{ "error": { "code": "VALIDATION_ERROR", "message": "password must be at least 8 characters" } }
```

---

### `POST /auth/login`
Log in to an existing account.

**Request body:**
```json
{
  "email": "ravi@example.com",
  "password": "minimum8chars"
}
```

**Responses:**

`200 OK` — logged in, tokens set in cookies
```json
{
  "user": {
    "id": "uuid",
    "email": "ravi@example.com",
    "username": "ravipandey"
  }
}
```

`401 Unauthorized` — wrong credentials
```json
{ "error": { "code": "INVALID_CREDENTIALS", "message": "Invalid email or password." } }
```

---

### `POST /auth/refresh`
Exchange a valid refresh token for a new access token. Client calls this silently before the access token expires.

**Request:** No body. The `refresh_token` cookie is read automatically.

**Responses:**

`200 OK` — new access token set in `access_token` cookie, new refresh token rotated in `refresh_token` cookie
```json
{ "ok": true }
```

`401 Unauthorized` — refresh token missing, expired, or not found in DB
```json
{ "error": { "code": "REFRESH_TOKEN_INVALID", "message": "Session expired. Please log in again." } }
```

---

### `POST /auth/logout`
End the current session.

**Request:** No body.

**Responses:**

`200 OK` — refresh token deleted from DB, both cookies cleared
```json
{ "ok": true }
```

---

## Room Endpoints

*All room endpoints require a valid `access_token` cookie.*

### `POST /rooms`
Create a new room.

**Request body:**
```json
{ "name": "Apollo-X" }
```

**Responses:**

`201 Created`
```json
{
  "room": {
    "id": "uuid",
    "name": "Apollo-X",
    "ownerId": "uuid",
    "createdAt": "2025-01-15T10:05:00.000Z"
  }
}
```

`422 Unprocessable Entity` — name missing or too long (max 64 chars)
```json
{ "error": { "code": "VALIDATION_ERROR", "message": "name is required and must be at most 64 characters." } }
```

---

### `GET /rooms`
Get the authenticated user's recent rooms (max 10, ordered by `joined_at` DESC).

**Responses:**

`200 OK`
```json
{
  "rooms": [
    {
      "id": "uuid",
      "name": "Apollo-X",
      "ownerId": "uuid",
      "createdAt": "2025-01-15T10:05:00.000Z"
    }
  ]
}
```

---

### `GET /rooms/:id`
Get a single room by ID.

**Responses:**

`200 OK`
```json
{
  "room": {
    "id": "uuid",
    "name": "Apollo-X",
    "ownerId": "uuid",
    "createdAt": "2025-01-15T10:05:00.000Z"
  }
}
```

`404 Not Found`
```json
{ "error": { "code": "ROOM_NOT_FOUND", "message": "No room with that ID exists." } }
```

---

### `DELETE /rooms/:id`
Delete a room. Only the room owner may do this.

**Responses:**

`200 OK`
```json
{ "ok": true }
```

`403 Forbidden`
```json
{ "error": { "code": "FORBIDDEN", "message": "Only the room owner can delete this room." } }
```

`404 Not Found`
```json
{ "error": { "code": "ROOM_NOT_FOUND", "message": "No room with that ID exists." } }
```

---

## User Endpoints

### `GET /users/me`
Get the authenticated user's own profile.

**Responses:**

`200 OK`
```json
{
  "user": {
    "id": "uuid",
    "email": "ravi@example.com",
    "username": "ravipandey",
    "createdAt": "2025-01-15T10:00:00.000Z"
  }
}
```

---

## WebSocket — `/room/:id`

*Requires a valid `access_token` cookie on the upgrade request.*
*Connection is closed with code `4004` if the room does not exist.*
*Connection is closed with code `4001` if the token is invalid.*

The WebSocket carries two distinct message types over the same connection:
1. **Binary frames** — Yjs protocol messages (sync, updates, awareness). These are `Uint8Array` buffers, not JSON.
2. **Text frames** — Application-level messages (chat, system events). These are JSON strings.

---

### Binary Messages — Yjs Protocol

These are handled automatically by `y-websocket` on the client and server. You do not write these manually.

| Message | Direction | Description |
|---------|-----------|-------------|
| Sync Step 1 | Client → Server | Client sends its current state vector to request missing updates |
| Sync Step 2 | Server → Client | Server sends all updates the client is missing |
| Update | Client → Server | Client sends a document change (keystroke, deletion, etc.) |
| Update relay | Server → all other clients | Server broadcasts the update to all other room participants |
| Awareness update | Client → Server | Client sends cursor position, selection, or presence state |
| Awareness relay | Server → all other clients | Server relays the awareness update |

---

### Text Messages — Application Protocol

#### Client → Server: Send a chat message
```json
{
  "type": "chat",
  "payload": {
    "text": "Looks solid. Adding the UI wrapper now."
  }
}
```

---

#### Server → Client: Deliver a chat message
Broadcast to all clients in the room (including sender) when any user sends a chat message.
```json
{
  "type": "chat-message",
  "payload": {
    "id": "uuid",
    "userId": "uuid",
    "username": "ravipandey",
    "text": "Looks solid. Adding the UI wrapper now.",
    "createdAt": "2025-01-15T14:05:00.000Z"
  }
}
```

---

#### Server → Client: Chat history on join
Sent once to the connecting client immediately after the Yjs sync completes.
```json
{
  "type": "chat-history",
  "payload": {
    "messages": [
      {
        "id": "uuid",
        "userId": "uuid",
        "username": "alex",
        "text": "I've implemented the socket connection logic.",
        "createdAt": "2025-01-15T14:02:00.000Z"
      }
    ]
  }
}
```

---

#### Server → Client: System event (join / leave)
Broadcast to all clients in the room when any user connects or disconnects.
```json
{
  "type": "system",
  "payload": {
    "event": "join",
    "username": "sarah"
  }
}
```

```json
{
  "type": "system",
  "payload": {
    "event": "leave",
    "username": "sarah"
  }
}
```

---

## Error Codes Reference

| Code | HTTP status | Description |
|------|------------|-------------|
| `VALIDATION_ERROR` | 422 | Request body failed schema validation |
| `EMAIL_TAKEN` | 409 | Registration email already in use |
| `USERNAME_TAKEN` | 409 | Registration username already in use |
| `INVALID_CREDENTIALS` | 401 | Login email/password mismatch |
| `UNAUTHORIZED` | 401 | Missing or expired access token |
| `REFRESH_TOKEN_INVALID` | 401 | Refresh token missing, expired, or revoked |
| `FORBIDDEN` | 403 | Authenticated but not allowed to perform this action |
| `ROOM_NOT_FOUND` | 404 | No room with the given ID |
| `INTERNAL_ERROR` | 500 | Unexpected server error |

---

## WebSocket Close Codes

| Code | Description |
|------|-------------|
| `4001` | Unauthorised — token invalid or missing |
| `4004` | Room not found |
| `4429` | Too many connections from this client |
