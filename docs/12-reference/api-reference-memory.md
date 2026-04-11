# API Reference — Memory Service

Base URL: `http://localhost:4000/api/v1` (via nginx) or `http://localhost:4005/api/v1` (direct)

---

## Memories

### POST /memories

Create a memory record manually.

**Auth**: Bearer token
**Request Body**:
```json
{
  "type": "FACT",
  "content": "User prefers TypeScript over JavaScript"
}
```

**Response 201**:
```json
{
  "id": "clmem...",
  "userId": "cluser...",
  "type": "FACT",
  "content": "User prefers TypeScript over JavaScript",
  "sourceThreadId": null,
  "sourceMessageId": null,
  "isEnabled": true,
  "createdAt": "2026-04-11T10:00:00.000Z",
  "updatedAt": "2026-04-11T10:00:00.000Z"
}
```

**curl**:
```bash
curl -X POST http://localhost:4000/api/v1/memories \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"type":"FACT","content":"User prefers TypeScript"}'
```

---

### GET /memories

List the current user's memories.

**Auth**: Bearer token
**Query Parameters**:
- `page` (int, default: 1)
- `limit` (int, default: 20, max: 100)
- `type` (enum) — FACT, PREFERENCE, INSTRUCTION, SUMMARY
- `search` (string)

**Response 200**: `PaginatedResult<MemoryRecord>`

---

### GET /memories/:id

Get a specific memory.

**Auth**: Bearer token (must own memory)
**Response 200**: MemoryRecord
**Errors**: `404 ENTITY_NOT_FOUND`, `403 FORBIDDEN`

---

### PATCH /memories/:id

Update a memory's content or type.

**Auth**: Bearer token (must own memory)
**Request Body**:
```json
{
  "content": "Updated content",
  "type": "PREFERENCE"
}
```
**Response 200**: Updated MemoryRecord

---

### DELETE /memories/:id

Delete a memory.

**Auth**: Bearer token (must own memory)
**Response 200**: Deleted MemoryRecord

---

### PATCH /memories/:id/toggle

Toggle a memory between enabled and disabled.

**Auth**: Bearer token (must own memory)
**Response 200**: Updated MemoryRecord with toggled `isEnabled`

---

## Context Packs

### POST /context-packs

Create a context pack.

**Auth**: Bearer token
**Request Body**:
```json
{
  "name": "Project Guidelines",
  "description": "Coding standards for my project",
  "scope": "coding"
}
```

**Response 201**: ContextPack object

---

### GET /context-packs

List the current user's context packs.

**Auth**: Bearer token
**Query Parameters**:
- `page` (int, default: 1)
- `limit` (int, default: 20)
- `search` (string)

**Response 200**: `PaginatedResult<ContextPack>`

---

### GET /context-packs/:id

Get a context pack with all its items.

**Auth**: Bearer token (must own pack)
**Response 200**:
```json
{
  "id": "clpack...",
  "userId": "cluser...",
  "name": "Project Guidelines",
  "description": "Coding standards",
  "scope": "coding",
  "items": [
    {
      "id": "clitem...",
      "type": "text",
      "content": "Always use TypeScript strict mode",
      "fileId": null,
      "sortOrder": 0
    }
  ],
  "createdAt": "2026-04-11T10:00:00.000Z"
}
```

---

### PATCH /context-packs/:id

Update a context pack.

**Auth**: Bearer token (must own pack)
**Request Body**:
```json
{ "name": "Updated Name", "description": "Updated description" }
```
**Response 200**: Updated ContextPack

---

### DELETE /context-packs/:id

Delete a context pack and all its items.

**Auth**: Bearer token (must own pack)
**Response 200**: Deleted ContextPack

---

### POST /context-packs/:id/items

Add an item to a context pack.

**Auth**: Bearer token (must own pack)
**Request Body**:
```json
{
  "type": "text",
  "content": "Always use const instead of let",
  "sortOrder": 1
}
```
Or for file items:
```json
{
  "type": "file",
  "fileId": "clfile...",
  "sortOrder": 2
}
```

**Response 201**: ContextPackItem

---

### DELETE /context-packs/:id/items/:itemId

Remove an item from a context pack.

**Auth**: Bearer token (must own pack)
**Response 200**: Deleted ContextPackItem

---

## Memory Types

| Type | Description | Example |
|------|-------------|---------|
| `FACT` | Factual info about the user | "Works at Google as a senior engineer" |
| `PREFERENCE` | User preferences | "Prefers TypeScript over JavaScript" |
| `INSTRUCTION` | Standing instructions | "Always explain code step by step" |
| `SUMMARY` | Conversation summaries | "Discussed React performance optimization" |
