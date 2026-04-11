# API Reference — Chat Service

Base URL: `http://localhost:4000/api/v1` (via nginx) or `http://localhost:4002/api/v1` (direct)

---

## Threads

### POST /chat-threads

Create a new chat thread.

**Auth**: Bearer token
**Request Body**:
```json
{
  "title": "My Chat",
  "routingMode": "AUTO",
  "preferredProvider": "anthropic",
  "preferredModel": "claude-sonnet-4",
  "systemPrompt": "You are a helpful assistant.",
  "temperature": 0.7,
  "maxTokens": 4096,
  "contextPackIds": ["clxyz..."]
}
```
All fields are optional.

**Response 201**:
```json
{
  "id": "clxyz...",
  "userId": "clxyz...",
  "title": "My Chat",
  "routingMode": "AUTO",
  "lastProvider": null,
  "lastModel": null,
  "isPinned": false,
  "isArchived": false,
  "preferredProvider": "anthropic",
  "preferredModel": "claude-sonnet-4",
  "contextPackIds": ["clxyz..."],
  "systemPrompt": "You are a helpful assistant.",
  "temperature": 0.7,
  "maxTokens": 4096,
  "createdAt": "2026-04-11T10:00:00.000Z",
  "updatedAt": "2026-04-11T10:00:00.000Z"
}
```

**curl**:
```bash
curl -X POST http://localhost:4000/api/v1/chat-threads \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"My Chat","routingMode":"AUTO"}'
```

---

### GET /chat-threads

List the current user's threads with message counts.

**Auth**: Bearer token
**Query Parameters**:
- `page` (int, default: 1)
- `limit` (int, default: 20, max: 100)
- `search` (string) — search by title

**Response 200**:
```json
{
  "data": [
    {
      "id": "clxyz...",
      "title": "My Chat",
      "routingMode": "AUTO",
      "lastProvider": "anthropic",
      "lastModel": "claude-sonnet-4",
      "isPinned": false,
      "isArchived": false,
      "createdAt": "2026-04-11T10:00:00.000Z",
      "_count": { "messages": 12 }
    }
  ],
  "meta": { "page": 1, "limit": 20, "total": 3, "totalPages": 1 }
}
```

---

### GET /chat-threads/:id

Get a specific thread.

**Auth**: Bearer token (must own thread)
**Response 200**: ChatThread object
**Errors**: `404 ENTITY_NOT_FOUND`, `403 FORBIDDEN`

---

### PATCH /chat-threads/:id

Update a thread.

**Auth**: Bearer token (must own thread)
**Request Body**: Any combination of:
```json
{
  "title": "New Title",
  "routingMode": "LOCAL_ONLY",
  "preferredProvider": null,
  "preferredModel": null,
  "systemPrompt": "Updated prompt",
  "temperature": 0.5,
  "maxTokens": 8192,
  "contextPackIds": [],
  "isPinned": true,
  "isArchived": false
}
```

**Response 200**: Updated ChatThread

---

### DELETE /chat-threads/:id

Delete a thread and all its messages.

**Auth**: Bearer token (must own thread)
**Response 200**: Deleted ChatThread

---

## Messages

### POST /chat-messages

Send a user message. Triggers routing and AI response.

**Auth**: Bearer token
**Request Body**:
```json
{
  "threadId": "clxyz...",
  "content": "Hello, how are you?",
  "fileIds": ["clfile1...", "clfile2..."]
}
```

**Response 201**: The created USER message
```json
{
  "id": "clmsg...",
  "threadId": "clxyz...",
  "role": "USER",
  "content": "Hello, how are you?",
  "provider": null,
  "model": null,
  "createdAt": "2026-04-11T10:00:00.000Z"
}
```

**Side effects**: Publishes `message.created` event which triggers:
1. Routing decision
2. AI provider call
3. ASSISTANT message creation
4. SSE event emission

---

### GET /chat-messages/thread/:threadId

List messages in a thread (paginated, newest first).

**Auth**: Bearer token (must own thread)
**Query Parameters**:
- `page` (int, default: 1)
- `limit` (int, default: 20, max: 100)

**Response 200**:
```json
{
  "data": [
    {
      "id": "clmsg1...",
      "role": "ASSISTANT",
      "content": "I'm doing well! How can I help?",
      "provider": "anthropic",
      "model": "claude-sonnet-4",
      "routingMode": "AUTO",
      "routerModel": "gemma3:4b",
      "usedFallback": false,
      "inputTokens": 150,
      "outputTokens": 45,
      "estimatedCost": "0.00023000",
      "latencyMs": 1200,
      "feedback": null,
      "metadata": null,
      "createdAt": "2026-04-11T10:00:01.000Z"
    },
    {
      "id": "clmsg0...",
      "role": "USER",
      "content": "Hello, how are you?",
      "provider": null,
      "model": null,
      "createdAt": "2026-04-11T10:00:00.000Z"
    }
  ],
  "meta": { "page": 1, "limit": 20, "total": 2, "totalPages": 1 }
}
```

---

### GET /chat-messages/:id

Get a specific message.

**Auth**: Bearer token (must own thread)
**Response 200**: ChatMessage object

---

### POST /chat-messages/:id/regenerate

Regenerate an AI response for a message.

**Auth**: Bearer token (must own thread)
**Response 200**: New ASSISTANT ChatMessage

---

### PATCH /chat-messages/:id/feedback

Set feedback on a message (thumbs up/down).

**Auth**: Bearer token (must own thread)
**Request Body**:
```json
{ "feedback": "positive" }
```
**Response 200**: Updated ChatMessage

---

## SSE Stream

### GET /chat-messages/stream/:threadId (SSE)

Server-Sent Events stream for real-time message updates.

**Auth**: Bearer token
**Response**: SSE event stream

**Events emitted**:
```
data: {"threadId":"clxyz...","type":"completion","message":{...}}

data: {"threadId":"clxyz...","type":"error","error":"All providers failed"}
```

**Important**: Do NOT use `EventSource` API (cannot set Authorization header). Use `fetch()` with `ReadableStream`:
```javascript
const response = await fetch(url, {
  headers: { Authorization: `Bearer ${token}` },
});
const reader = response.body.getReader();
```

**curl**:
```bash
curl -N http://localhost:4000/api/v1/chat-messages/stream/clxyz... \
  -H "Authorization: Bearer $TOKEN"
```
