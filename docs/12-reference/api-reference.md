# ClawAI API Reference

All endpoints are served through the Nginx reverse proxy on port 4000 with the prefix `/api/v1/`. Unless marked as `@Public`, all endpoints require a valid JWT access token in the `Authorization: Bearer <token>` header.

**Base URL:** `http://localhost:4000/api/v1`

**Common Headers:**

| Header        | Required             | Description                        |
| ------------- | -------------------- | ---------------------------------- |
| Authorization | Yes (except @Public) | `Bearer <JWT access token>`        |
| Content-Type  | Yes (POST/PATCH)     | `application/json`                 |
| X-Request-ID  | No                   | Correlation ID for request tracing |

**Pagination:** List endpoints return a standard paginated response:

```json
{
  "data": [...],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8
  }
}
```

---

## 1. Authentication (claw-auth-service, port 4001)

### POST /api/v1/auth/login

**Auth Required:** No (@Public)

Login with email and password. Returns JWT token pair and user profile.

**Request Body:**

```json
{
  "email": "admin@example.com",
  "password": "securepassword"
}
```

| Field    | Type   | Required | Constraints        |
| -------- | ------ | -------- | ------------------ |
| email    | string | Yes      | Valid email format |
| password | string | Yes      | Min 1 character    |

**Response (200):**

```json
{
  "tokens": {
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
  },
  "user": {
    "id": "uuid",
    "email": "admin@example.com",
    "username": "admin",
    "role": "ADMIN",
    "mustChangePassword": false,
    "languagePreference": "en",
    "appearancePreference": "system"
  }
}
```

**Error Responses:**

| Status | Code                | Description                    |
| ------ | ------------------- | ------------------------------ |
| 401    | INVALID_CREDENTIALS | Email or password is incorrect |
| 403    | ACCOUNT_SUSPENDED   | User account is suspended      |

---

### POST /api/v1/auth/refresh

**Auth Required:** No (@Public)

Exchange a valid refresh token for a new token pair (rotation).

**Request Body:**

```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

**Response (200):**

```json
{
  "tokens": {
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
  }
}
```

**Error Responses:**

| Status | Code                  | Description                           |
| ------ | --------------------- | ------------------------------------- |
| 401    | INVALID_REFRESH_TOKEN | Token is expired, revoked, or invalid |

---

### POST /api/v1/auth/logout

**Auth Required:** Yes

Invalidate all sessions for the authenticated user.

**Response:** 204 No Content

---

### GET /api/v1/auth/me

**Auth Required:** Yes

Retrieve the authenticated user's profile.

**Response (200):**

```json
{
  "id": "uuid",
  "email": "admin@example.com",
  "username": "admin",
  "role": "ADMIN",
  "mustChangePassword": false,
  "languagePreference": "en",
  "appearancePreference": "system"
}
```

---

## 2. Users (claw-auth-service, port 4001)

### POST /api/v1/users

**Auth Required:** Yes | **Role:** ADMIN

Create a new user.

**Request Body:**

```json
{
  "email": "user@example.com",
  "username": "newuser",
  "password": "securepassword",
  "role": "OPERATOR"
}
```

**Response (201):** SafeUser object (excludes passwordHash).

**Error Responses:**

| Status | Code             | Description                           |
| ------ | ---------------- | ------------------------------------- |
| 409    | DUPLICATE_ENTITY | A user with this email already exists |

---

### GET /api/v1/users

**Auth Required:** Yes | **Role:** ADMIN

List all users with pagination.

**Query Parameters:**

| Param  | Type   | Default | Description                 |
| ------ | ------ | ------- | --------------------------- |
| page   | number | 1       | Page number                 |
| limit  | number | 20      | Items per page              |
| search | string | -       | Search by email or username |

**Response (200):** Paginated list of SafeUser objects.

---

### GET /api/v1/users/:id

**Auth Required:** Yes | **Role:** ADMIN

Get a single user by ID.

**Response (200):** SafeUser object.

**Error Responses:**

| Status | Code             | Description                           |
| ------ | ---------------- | ------------------------------------- |
| 404    | ENTITY_NOT_FOUND | User with the given ID does not exist |

---

### PATCH /api/v1/users/:id

**Auth Required:** Yes | **Role:** ADMIN

Update a user's details.

**Request Body:**

```json
{
  "username": "updatedname",
  "email": "updated@example.com"
}
```

**Response (200):** Updated SafeUser object.

---

### DELETE /api/v1/users/:id

**Auth Required:** Yes | **Role:** ADMIN

Deactivate a user (soft delete). Cannot deactivate self.

**Response (200):** Deactivated SafeUser object.

---

### PATCH /api/v1/users/:id/reactivate

**Auth Required:** Yes | **Role:** ADMIN

Reactivate a previously deactivated user.

**Response (200):** Reactivated SafeUser object.

---

### PATCH /api/v1/users/:id/role

**Auth Required:** Yes | **Role:** ADMIN

Change a user's role. Cannot change own role.

**Request Body:**

```json
{
  "role": "ADMIN"
}
```

| Field | Type          | Required | Values                  |
| ----- | ------------- | -------- | ----------------------- |
| role  | string (enum) | Yes      | ADMIN, OPERATOR, VIEWER |

**Response (200):** Updated SafeUser object.

---

### PATCH /api/v1/users/me/preferences

**Auth Required:** Yes

Update the authenticated user's preferences.

**Request Body:**

```json
{
  "languagePreference": "ar",
  "appearancePreference": "dark"
}
```

**Response (200):** Updated SafeUser object.

---

### PATCH /api/v1/users/me/password

**Auth Required:** Yes

Change the authenticated user's password.

**Request Body:**

```json
{
  "currentPassword": "oldpassword",
  "newPassword": "newsecurepassword"
}
```

**Response:** 204 No Content

**Error Responses:**

| Status | Code                     | Description                                         |
| ------ | ------------------------ | --------------------------------------------------- |
| 400    | INVALID_CURRENT_PASSWORD | Current password is incorrect                       |
| 400    | SAME_PASSWORD_ERROR      | New password cannot be the same as current password |

---

## 3. Chat Threads (claw-chat-service, port 4002)

### POST /api/v1/chat-threads

**Auth Required:** Yes

Create a new chat thread.

**Request Body:**

```json
{
  "title": "Code Review Session",
  "routingMode": "AUTO",
  "systemPrompt": "You are a senior code reviewer.",
  "temperature": 0.3,
  "maxTokens": 4000,
  "preferredProvider": "anthropic",
  "preferredModel": "claude-sonnet-4",
  "contextPackIds": ["uuid-1", "uuid-2"]
}
```

| Field             | Type     | Required | Constraints                                                                            |
| ----------------- | -------- | -------- | -------------------------------------------------------------------------------------- |
| title             | string   | No       | Max 255 chars                                                                          |
| routingMode       | enum     | No       | AUTO, MANUAL_MODEL, LOCAL_ONLY, PRIVACY_FIRST, LOW_LATENCY, HIGH_REASONING, COST_SAVER |
| systemPrompt      | string   | No       | Max 10,000 chars                                                                       |
| temperature       | number   | No       | 0.0 to 2.0                                                                             |
| maxTokens         | integer  | No       | 1 to 32,000                                                                            |
| preferredProvider | string   | No       | Max 50 chars                                                                           |
| preferredModel    | string   | No       | Max 255 chars                                                                          |
| contextPackIds    | string[] | No       | Max 10 items                                                                           |

**Response (201):** ChatThread object.

---

### GET /api/v1/chat-threads

**Auth Required:** Yes

List the authenticated user's threads with message counts.

**Query Parameters:**

| Param  | Type   | Default | Description     |
| ------ | ------ | ------- | --------------- |
| page   | number | 1       | Page number     |
| limit  | number | 20      | Items per page  |
| search | string | -       | Search by title |

**Response (200):** Paginated list of ThreadWithMessageCount objects.

---

### GET /api/v1/chat-threads/:id

**Auth Required:** Yes

Get a single thread. Must be owned by the authenticated user.

**Response (200):** ChatThread object.

**Error Responses:**

| Status | Code                    | Description                    |
| ------ | ----------------------- | ------------------------------ |
| 404    | ENTITY_NOT_FOUND        | Thread does not exist          |
| 403    | FORBIDDEN_THREAD_ACCESS | Thread belongs to another user |

---

### PATCH /api/v1/chat-threads/:id

**Auth Required:** Yes

Update a thread's settings. Must be owned by the authenticated user.

**Request Body:** Same fields as create (all optional).

**Response (200):** Updated ChatThread object.

---

### DELETE /api/v1/chat-threads/:id

**Auth Required:** Yes

Delete a thread and all associated messages. Must be owned by the authenticated user.

**Response (200):** Deleted ChatThread object.

---

## 4. Chat Messages (claw-chat-service, port 4002)

### POST /api/v1/chat-messages

**Auth Required:** Yes

Send a message and trigger AI response generation.

**Request Body:**

```json
{
  "threadId": "uuid",
  "content": "Review this Python function for bugs:\n\ndef calculate(x, y):\n  return x / y",
  "routingMode": "AUTO",
  "provider": "anthropic",
  "model": "claude-sonnet-4",
  "fileIds": ["uuid-1", "uuid-2"]
}
```

| Field       | Type     | Required | Constraints                                                       |
| ----------- | -------- | -------- | ----------------------------------------------------------------- |
| threadId    | string   | Yes      | Max 255 chars, must exist and be owned by user                    |
| content     | string   | Yes      | 1 to 100,000 chars                                                |
| routingMode | enum     | No       | Overrides thread routing mode for this message                    |
| provider    | string   | No       | Max 50 chars, forces specific provider                            |
| model       | string   | No       | Max 255 chars, forces specific model                              |
| fileIds     | string[] | No       | Max 10 items, files must be owned by user with ingestion complete |

**Response (201):** ChatMessage object (the USER message). The ASSISTANT message is generated asynchronously and delivered via SSE.

**Error Responses:**

| Status | Code                    | Description                         |
| ------ | ----------------------- | ----------------------------------- |
| 404    | ENTITY_NOT_FOUND        | Thread or referenced file not found |
| 403    | FORBIDDEN_THREAD_ACCESS | Thread belongs to another user      |

---

### GET /api/v1/chat-messages/thread/:threadId

**Auth Required:** Yes

List messages in a thread (paginated). Must own the thread.

**Query Parameters:**

| Param | Type   | Default | Description    |
| ----- | ------ | ------- | -------------- |
| page  | number | 1       | Page number    |
| limit | number | 20      | Items per page |

**Response (200):** Paginated list of ChatMessage objects.

---

### GET /api/v1/chat-messages/:id

**Auth Required:** Yes

Get a single message. Must own the containing thread.

**Response (200):** ChatMessage object.

---

### POST /api/v1/chat-messages/:id/regenerate

**Auth Required:** Yes

Regenerate the AI response for a message. Must own the containing thread.

**Response (200):** Updated ChatMessage object.

---

### PATCH /api/v1/chat-messages/:id/feedback

**Auth Required:** Yes

Set feedback on a message.

**Request Body:**

```json
{
  "feedback": "POSITIVE"
}
```

**Response (200):** Updated ChatMessage object.

---

### GET /api/v1/chat-messages/stream/:threadId (SSE)

**Auth Required:** Yes

Server-Sent Events endpoint for real-time message updates.

**Response:** Event stream. Each event contains a JSON-encoded payload:

```
data: {"type":"completion","threadId":"uuid","messageId":"uuid","content":"...","provider":"anthropic","model":"claude-sonnet-4"}

data: {"type":"error","threadId":"uuid","error":"All LLM providers failed"}
```

**Notes:**

- Excluded from rate limiting and request logging.
- Connection remains open until the client disconnects.
- Events are filtered by threadId.

---

## 5. Connectors (claw-connector-service, port 4003)

### POST /api/v1/connectors

**Auth Required:** Yes

Create a new AI provider connector.

**Request Body:**

```json
{
  "name": "OpenAI Production",
  "provider": "OPENAI",
  "authType": "API_KEY",
  "apiKey": "sk-...",
  "baseUrl": "https://api.openai.com/v1",
  "region": "us-east-1"
}
```

| Field    | Type   | Required | Constraints                                         |
| -------- | ------ | -------- | --------------------------------------------------- |
| name     | string | Yes      | 1-100 chars                                         |
| provider | enum   | Yes      | OPENAI, ANTHROPIC, GEMINI, DEEPSEEK, OLLAMA, CUSTOM |
| authType | enum   | Yes      | API_KEY, OAUTH, NONE                                |
| apiKey   | string | No       | Max 500 chars (AES-256-GCM encrypted)               |
| baseUrl  | string | No       | Max 500 chars                                       |
| region   | string | No       | Max 50 chars                                        |

**Response (201):** ConnectorWithModels object.

---

### GET /api/v1/connectors

**Auth Required:** Yes

List all connectors with their models.

**Query Parameters:**

| Param    | Type   | Default | Description        |
| -------- | ------ | ------- | ------------------ |
| page     | number | 1       | Page number        |
| limit    | number | 20      | Items per page     |
| provider | string | -       | Filter by provider |
| status   | string | -       | Filter by status   |

**Response (200):** Paginated list of ConnectorWithModels objects.

---

### GET /api/v1/connectors/:id

**Auth Required:** Yes

Get a single connector with its models.

**Response (200):** ConnectorWithModels object.

---

### PATCH /api/v1/connectors/:id

**Auth Required:** Yes

Update a connector.

**Request Body:** Same fields as create (all optional).

**Response (200):** Updated ConnectorWithModels object.

---

### DELETE /api/v1/connectors/:id

**Auth Required:** Yes

Delete a connector and all associated models.

**Response (200):** Deleted ConnectorWithModels object.

---

### POST /api/v1/connectors/:id/test

**Auth Required:** Yes

Test a connector's configuration by making a live API call.

**Response (200):**

```json
{
  "healthy": true,
  "latencyMs": 342,
  "error": null
}
```

---

### POST /api/v1/connectors/:id/sync

**Auth Required:** Yes

Sync available models from the provider.

**Response (200):**

```json
{
  "added": 3,
  "updated": 1,
  "removed": 0,
  "total": 4
}
```

---

### GET /api/v1/connectors/:id/models

**Auth Required:** Yes

List all models for a specific connector.

**Response (200):** Array of ConnectorModel objects.

```json
[
  {
    "id": "uuid",
    "connectorId": "uuid",
    "modelKey": "gpt-4o",
    "displayName": "GPT-4o",
    "lifecycle": "ACTIVE",
    "supportsStreaming": true,
    "supportsTools": true,
    "supportsVision": true,
    "supportsAudio": false
  }
]
```

---

## 6. Routing (claw-routing-service, port 4004)

### POST /api/v1/routing/policies

**Auth Required:** Yes

Create a routing policy.

**Request Body:**

```json
{
  "name": "Route coding to Anthropic",
  "routingMode": "AUTO",
  "priority": 100,
  "config": {
    "taskTypes": ["coding", "debugging"],
    "preferredProvider": "anthropic",
    "preferredModel": "claude-sonnet-4"
  }
}
```

| Field       | Type    | Required | Constraints                                                                            |
| ----------- | ------- | -------- | -------------------------------------------------------------------------------------- |
| name        | string  | Yes      | 1-255 chars                                                                            |
| routingMode | enum    | Yes      | AUTO, MANUAL_MODEL, LOCAL_ONLY, PRIVACY_FIRST, LOW_LATENCY, HIGH_REASONING, COST_SAVER |
| priority    | integer | Yes      | 0-1000                                                                                 |
| config      | object  | Yes      | JSON object with policy-specific configuration                                         |

**Response (201):** RoutingPolicy object.

---

### GET /api/v1/routing/policies

**Auth Required:** Yes

List routing policies with pagination.

**Query Parameters:**

| Param | Type   | Default | Description    |
| ----- | ------ | ------- | -------------- |
| page  | number | 1       | Page number    |
| limit | number | 20      | Items per page |

**Response (200):** Paginated list of RoutingPolicy objects.

---

### GET /api/v1/routing/policies/:id

**Auth Required:** Yes

Get a single routing policy.

**Response (200):** RoutingPolicy object.

---

### PATCH /api/v1/routing/policies/:id

**Auth Required:** Yes

Update a routing policy.

**Request Body:** Same fields as create (all optional).

**Response (200):** Updated RoutingPolicy object.

---

### DELETE /api/v1/routing/policies/:id

**Auth Required:** Yes

Delete a routing policy.

**Response (200):** Deleted RoutingPolicy object.

---

### POST /api/v1/routing/evaluate

**Auth Required:** Yes

Evaluate what routing decision would be made for a given input (dry run).

**Request Body:**

```json
{
  "content": "Review this Python function for bugs",
  "routingMode": "AUTO",
  "provider": null,
  "model": null
}
```

**Response (200):**

```json
{
  "selectedProvider": "anthropic",
  "selectedModel": "claude-sonnet-4",
  "confidence": 0.92,
  "reasonTags": ["coding", "code_review"],
  "privacyClass": "CLOUD",
  "costClass": "STANDARD",
  "fallback": {
    "provider": "openai",
    "model": "gpt-4o"
  }
}
```

---

### GET /api/v1/routing/decisions/:threadId

**Auth Required:** Yes

Get routing decision history for a thread.

**Query Parameters:**

| Param | Type   | Default | Description    |
| ----- | ------ | ------- | -------------- |
| page  | number | 1       | Page number    |
| limit | number | 20      | Items per page |

**Response (200):** Paginated list of RoutingDecision objects.

---

## 7. Memories (claw-memory-service, port 4005)

### POST /api/v1/memories

**Auth Required:** Yes

Create a memory record.

**Request Body:**

```json
{
  "type": "INSTRUCTION",
  "content": "Always respond in formal English.",
  "sourceThreadId": "uuid",
  "sourceMessageId": "uuid"
}
```

| Field           | Type   | Required | Constraints                            |
| --------------- | ------ | -------- | -------------------------------------- |
| type            | enum   | Yes      | FACT, PREFERENCE, INSTRUCTION, SUMMARY |
| content         | string | Yes      | 1-50,000 chars                         |
| sourceThreadId  | string | No       | Max 255 chars                          |
| sourceMessageId | string | No       | Max 255 chars                          |

**Response (201):** MemoryRecord object.

---

### GET /api/v1/memories

**Auth Required:** Yes

List the authenticated user's memories.

**Query Parameters:**

| Param  | Type   | Default | Description                 |
| ------ | ------ | ------- | --------------------------- |
| page   | number | 1       | Page number                 |
| limit  | number | 20      | Items per page              |
| type   | string | -       | Filter by memory type       |
| search | string | -       | Full-text search in content |

**Response (200):** Paginated list of MemoryRecord objects.

---

### GET /api/v1/memories/:id

**Auth Required:** Yes

Get a single memory record. Must be owned by the authenticated user.

**Response (200):** MemoryRecord object.

**Error Responses:**

| Status | Code                    | Description                    |
| ------ | ----------------------- | ------------------------------ |
| 404    | ENTITY_NOT_FOUND        | Memory record not found        |
| 403    | FORBIDDEN_MEMORY_ACCESS | Memory belongs to another user |

---

### PATCH /api/v1/memories/:id

**Auth Required:** Yes

Update a memory record. Must be owned by the authenticated user.

**Request Body:**

```json
{
  "content": "Updated memory content",
  "type": "FACT",
  "isEnabled": true
}
```

**Response (200):** Updated MemoryRecord object.

---

### DELETE /api/v1/memories/:id

**Auth Required:** Yes

Permanently delete a memory record. Must be owned by the authenticated user.

**Response (200):** Deleted MemoryRecord object.

---

### PATCH /api/v1/memories/:id/toggle

**Auth Required:** Yes

Toggle the enabled/disabled state of a memory. Must be owned by the authenticated user.

**Response (200):** Updated MemoryRecord object with flipped isEnabled value.

---

## 8. Context Packs (claw-memory-service, port 4005)

### POST /api/v1/context-packs

**Auth Required:** Yes

Create a context pack.

**Request Body:**

```json
{
  "name": "Project Coding Standards",
  "description": "Conventions and patterns for our NestJS project",
  "scope": "PERSONAL"
}
```

**Response (201):** ContextPack object.

---

### GET /api/v1/context-packs

**Auth Required:** Yes

List the authenticated user's context packs.

**Query Parameters:**

| Param  | Type   | Default | Description    |
| ------ | ------ | ------- | -------------- |
| page   | number | 1       | Page number    |
| limit  | number | 20      | Items per page |
| search | string | -       | Search by name |

**Response (200):** Paginated list of ContextPack objects.

---

### GET /api/v1/context-packs/:id

**Auth Required:** Yes

Get a context pack with all its items. Must be owned by the authenticated user.

**Response (200):** ContextPackWithItems object.

```json
{
  "id": "uuid",
  "name": "Project Coding Standards",
  "description": "...",
  "scope": "PERSONAL",
  "userId": "uuid",
  "items": [
    {
      "id": "uuid",
      "type": "TEXT",
      "content": "Use strict TypeScript with no-any rule.",
      "fileId": null,
      "sortOrder": 1
    }
  ]
}
```

**Error Responses:**

| Status | Code                          | Description                  |
| ------ | ----------------------------- | ---------------------------- |
| 404    | ENTITY_NOT_FOUND              | Context pack not found       |
| 403    | FORBIDDEN_CONTEXT_PACK_ACCESS | Pack belongs to another user |

---

### PATCH /api/v1/context-packs/:id

**Auth Required:** Yes

Update a context pack. Must be owned by the authenticated user.

**Response (200):** Updated ContextPack object.

---

### DELETE /api/v1/context-packs/:id

**Auth Required:** Yes

Delete a context pack and all its items. Must be owned by the authenticated user.

**Response (200):** Deleted ContextPack object.

---

### POST /api/v1/context-packs/:id/items

**Auth Required:** Yes

Add an item to a context pack. Must own the pack.

**Request Body:**

```json
{
  "type": "TEXT",
  "content": "Always use camelCase for variables.",
  "fileId": null,
  "sortOrder": 1
}
```

**Response (201):** ContextPackItem object.

---

### DELETE /api/v1/context-packs/:id/items/:itemId

**Auth Required:** Yes

Remove an item from a context pack. Must own the pack.

**Response (200):** Deleted ContextPackItem object.

---

## 9. Files (claw-file-service, port 4006)

### POST /api/v1/files/upload

**Auth Required:** Yes

Upload a file for use in chat conversations.

**Request Body:**

```json
{
  "filename": "data.csv",
  "mimeType": "text/csv",
  "sizeBytes": 2048576,
  "content": "base64-encoded-content..."
}
```

**Response (201):** File object with ingestionStatus.

**Error Responses:**

| Status | Code              | Description                                     |
| ------ | ----------------- | ----------------------------------------------- |
| 400    | INVALID_MIME_TYPE | The file's MIME type is not in the allowed list |
| 400    | FILE_TOO_LARGE    | File exceeds the 50MB maximum size              |

---

### GET /api/v1/files

**Auth Required:** Yes

List the authenticated user's files.

**Query Parameters:**

| Param | Type   | Default | Description    |
| ----- | ------ | ------- | -------------- |
| page  | number | 1       | Page number    |
| limit | number | 20      | Items per page |

**Response (200):** Paginated list of File objects.

---

### GET /api/v1/files/:id

**Auth Required:** Yes

Get a single file's metadata. Must be owned by the authenticated user.

**Response (200):** File object.

**Error Responses:**

| Status | Code                  | Description                  |
| ------ | --------------------- | ---------------------------- |
| 404    | ENTITY_NOT_FOUND      | File not found               |
| 403    | FORBIDDEN_FILE_ACCESS | File belongs to another user |

---

### DELETE /api/v1/files/:id

**Auth Required:** Yes

Delete a file and its chunks. Must be owned by the authenticated user.

**Response (200):** Deleted File object.

---

### GET /api/v1/files/download/:id

**Auth Required:** Yes

Download a file. Must be owned by the authenticated user.

**Response:** File binary stream with appropriate Content-Type and Content-Disposition headers.

---

### GET /api/v1/files/:id/chunks

**Auth Required:** Yes

Get all chunks for a file. Must be owned by the authenticated user.

**Response (200):** Array of FileChunk objects.

```json
[
  {
    "id": "uuid",
    "fileId": "uuid",
    "chunkIndex": 0,
    "content": "chunk content..."
  }
]
```

---

## 10. Audits (claw-audit-service, port 4007)

### GET /api/v1/audits

**Auth Required:** Yes

List audit log entries.

**Query Parameters:**

| Param      | Type   | Default | Description                                |
| ---------- | ------ | ------- | ------------------------------------------ |
| page       | number | 1       | Page number                                |
| limit      | number | 20      | Items per page                             |
| action     | string | -       | Filter by action (e.g., message.completed) |
| severity   | string | -       | Filter by severity                         |
| entityType | string | -       | Filter by entity type                      |
| startDate  | string | -       | ISO 8601 date (inclusive)                  |
| endDate    | string | -       | ISO 8601 date (inclusive)                  |
| search     | string | -       | Full-text search                           |

**Response (200):** Paginated list of AuditLog objects.

---

### GET /api/v1/audits/stats

**Auth Required:** Yes

Get aggregated audit statistics.

**Response (200):** AuditStatsResponse object with event counts and severity breakdowns.

---

### GET /api/v1/usage

**Auth Required:** Yes

List usage ledger entries.

**Query Parameters:**

| Param     | Type   | Default | Description        |
| --------- | ------ | ------- | ------------------ |
| page      | number | 1       | Page number        |
| limit     | number | 20      | Items per page     |
| provider  | string | -       | Filter by provider |
| model     | string | -       | Filter by model    |
| startDate | string | -       | ISO 8601 date      |
| endDate   | string | -       | ISO 8601 date      |

**Response (200):** Paginated list of UsageLedger objects.

---

### GET /api/v1/usage/summary

**Auth Required:** Yes

Get aggregated usage summary.

**Response (200):** UsageSummaryResponse object.

---

### GET /api/v1/usage/cost

**Auth Required:** Yes

Get cost breakdown by provider and model.

**Response (200):** CostSummaryResult object.

---

### GET /api/v1/usage/latency

**Auth Required:** Yes

Get latency statistics by provider and model.

**Response (200):** LatencySummaryResult object.

---

## 11. Ollama (claw-ollama-service, port 4008)

### GET /api/v1/ollama/models

**Auth Required:** Yes

List local models with optional filters.

**Query Parameters:**

| Param       | Type    | Default | Description                   |
| ----------- | ------- | ------- | ----------------------------- |
| page        | number  | 1       | Page number                   |
| limit       | number  | 20      | Items per page                |
| runtime     | string  | -       | Filter by runtime type        |
| isInstalled | boolean | -       | Filter by installation status |

**Response (200):** Paginated list of LocalModel objects.

---

### POST /api/v1/ollama/pull

**Auth Required:** Yes

Pull (download) a model from the Ollama registry.

**Request Body:**

```json
{
  "name": "mistral",
  "tag": "7b"
}
```

**Response (201):** LocalModel object.

---

### POST /api/v1/ollama/assign-role

**Auth Required:** Yes

Assign a role to a local model.

**Request Body:**

```json
{
  "modelId": "uuid",
  "role": "ROUTER"
}
```

| Field   | Type   | Required | Values                                   |
| ------- | ------ | -------- | ---------------------------------------- |
| modelId | string | Yes      | UUID of an existing local model          |
| role    | enum   | Yes      | ROUTER, FALLBACK_CHAT, REASONING, CODING |

**Response (201):** LocalModelRoleAssignment object.

**Error Responses:**

| Status | Code             | Description                            |
| ------ | ---------------- | -------------------------------------- |
| 404    | ENTITY_NOT_FOUND | Model with the given ID does not exist |

---

### POST /api/v1/ollama/generate

**Auth Required:** No (@Public)

Generate text using a local Ollama model. Used internally by routing and memory services.

**Request Body:**

```json
{
  "model": "gemma3:4b",
  "prompt": "Classify this message...",
  "temperature": 0,
  "maxTokens": 500
}
```

**Response (200):**

```json
{
  "response": "Generated text...",
  "model": "gemma3:4b",
  "done": true,
  "promptEvalCount": 45,
  "evalCount": 120
}
```

---

### GET /api/v1/ollama/health

**Auth Required:** No (@Public)

Check Ollama runtime health.

**Query Parameters:**

| Param   | Type   | Default | Description           |
| ------- | ------ | ------- | --------------------- |
| runtime | string | OLLAMA  | Runtime type to check |

**Response (200):**

```json
{
  "healthy": true,
  "runtime": "OLLAMA",
  "modelsLoaded": 5,
  "latencyMs": 42
}
```

---

### GET /api/v1/ollama/runtimes

**Auth Required:** Yes

List all runtime configurations.

**Response (200):** Array of RuntimeConfig objects.

---

## 12. Images (claw-image-service)

### GET /api/v1/images

**Auth Required:** Yes

List the authenticated user's image generations.

**Query Parameters:**

| Param | Type   | Default | Description |
| ----- | ------ | ------- | ----------- |
| page  | number | 1       | Page number |
| limit | number | 20      | Max 100     |

**Response (200):** Paginated list of image generation records.

---

### GET /api/v1/images/:id

**Auth Required:** Yes

Get details of a specific image generation.

**Response (200):** Image generation record.

**Error Responses:**

| Status | Code            | Description                       |
| ------ | --------------- | --------------------------------- |
| 400    | IMAGE_NOT_FOUND | Image generation record not found |

---

### POST /api/v1/images/:id/retry

**Auth Required:** Yes

Retry a failed image generation with the same parameters.

**Response (200):**

```json
{
  "generationId": "uuid",
  "status": "PENDING"
}
```

---

### POST /api/v1/images/:id/retry-alternate

**Auth Required:** Yes

Retry image generation with a different provider or model.

**Request Body (optional):**

```json
{
  "provider": "gemini",
  "model": "imagen-3"
}
```

**Response (200):**

```json
{
  "generationId": "uuid",
  "status": "PENDING",
  "provider": "gemini",
  "model": "imagen-3"
}
```

**Error Responses:**

| Status | Code               | Description                           |
| ------ | ------------------ | ------------------------------------- |
| 400    | NO_ALTERNATE_MODEL | No alternate image model is available |

---

### GET /api/v1/images/:id/events (SSE)

**Auth Required:** No (@Public)

Server-Sent Events for image generation progress.

**Response:** Event stream with generation status updates.

---

## 13. File Generations (claw-file-generation-service)

### GET /api/v1/file-generations

**Auth Required:** Yes

List the authenticated user's file generations.

**Query Parameters:**

| Param | Type   | Default | Description |
| ----- | ------ | ------- | ----------- |
| page  | number | 1       | Page number |
| limit | number | 20      | Max 100     |

**Response (200):** Paginated list of file generation records.

---

### GET /api/v1/file-generations/:id

**Auth Required:** Yes

Get details of a specific file generation.

**Response (200):** File generation record.

**Error Responses:**

| Status | Code                      | Description                      |
| ------ | ------------------------- | -------------------------------- |
| 400    | FILE_GENERATION_NOT_FOUND | File generation record not found |

---

### POST /api/v1/file-generations/:id/retry

**Auth Required:** Yes

Retry a failed file generation.

**Response (200):**

```json
{
  "generationId": "uuid",
  "status": "PENDING"
}
```

---

### GET /api/v1/file-generations/:id/events (SSE)

**Auth Required:** No (@Public)

Server-Sent Events for file generation progress.

**Response:** Event stream with generation status updates.

---

## 14. Client Logs (claw-client-logs-service, port 4010)

### POST /api/v1/client-logs

**Auth Required:** No (@Public)

Submit frontend log entries.

**Request Body:**

```json
{
  "level": "ERROR",
  "message": "Failed to load chat thread",
  "component": "ChatPage",
  "action": "loadThread",
  "userId": "uuid",
  "route": "/chat/uuid",
  "userAgent": "Mozilla/5.0..."
}
```

**Response (201):**

```json
{
  "id": "objectId",
  "acknowledged": true
}
```

---

### GET /api/v1/client-logs

**Auth Required:** Yes | **Role:** ADMIN or OPERATOR

Search client logs.

**Query Parameters:**

| Param     | Type   | Default | Description              |
| --------- | ------ | ------- | ------------------------ |
| page      | number | 1       | Page number              |
| limit     | number | 20      | Items per page           |
| level     | string | -       | Filter by log level      |
| component | string | -       | Filter by component name |
| search    | string | -       | Full-text search         |
| startDate | string | -       | ISO 8601 date            |
| endDate   | string | -       | ISO 8601 date            |

**Response (200):** Paginated list of ClientLog objects.

---

### GET /api/v1/client-logs/stats

**Auth Required:** Yes | **Role:** ADMIN or OPERATOR

Get client log statistics.

**Response (200):** ClientLogStatsResponse object.

---

## 15. Server Logs (claw-server-logs-service, port 4011)

### POST /api/v1/server-logs

**Auth Required:** No (@Public, for inter-service use)

Submit a single server log entry.

**Request Body:**

```json
{
  "level": "ERROR",
  "message": "Database connection failed",
  "serviceName": "chat-service",
  "module": "ChatMessagesService",
  "action": "createMessage",
  "requestId": "uuid",
  "traceId": "uuid"
}
```

**Response (201):** CreateServerLogResponse.

---

### POST /api/v1/server-logs/batch

**Auth Required:** No (@Public, for inter-service use)

Submit multiple server log entries at once.

**Request Body:**

```json
{
  "entries": [
    { "level": "INFO", "message": "...", "serviceName": "..." },
    { "level": "WARN", "message": "...", "serviceName": "..." }
  ]
}
```

**Response (201):** BatchCreateServerLogsResponse.

---

### GET /api/v1/server-logs

**Auth Required:** Yes

Search server logs with extensive filters.

**Query Parameters:**

| Param       | Type   | Default | Description               |
| ----------- | ------ | ------- | ------------------------- |
| page        | number | 1       | Page number               |
| limit       | number | 20      | Items per page            |
| level       | string | -       | Filter by log level       |
| serviceName | string | -       | Filter by service name    |
| module      | string | -       | Filter by module name     |
| controller  | string | -       | Filter by controller name |
| action      | string | -       | Filter by action          |
| requestId   | string | -       | Filter by request ID      |
| traceId     | string | -       | Filter by trace ID        |
| userId      | string | -       | Filter by user ID         |
| threadId    | string | -       | Filter by thread ID       |
| provider    | string | -       | Filter by AI provider     |
| search      | string | -       | Full-text search          |
| startDate   | string | -       | ISO 8601 date             |
| endDate     | string | -       | ISO 8601 date             |

**Response (200):** Paginated list of ServerLog objects.

---

### GET /api/v1/server-logs/stats

**Auth Required:** Yes

Get server log statistics.

**Response (200):** ServerLogStatsResponse object.

---

## 16. Health (claw-health-service, port 4009)

### GET /api/v1/health

**Auth Required:** No

Aggregated health status of all services.

**Response (200):**

```json
{
  "status": "healthy",
  "services": {
    "auth": { "status": "healthy", "latencyMs": 12 },
    "chat": { "status": "healthy", "latencyMs": 8 },
    "connector": { "status": "healthy", "latencyMs": 15 },
    "routing": { "status": "healthy", "latencyMs": 10 },
    "memory": { "status": "healthy", "latencyMs": 11 },
    "file": { "status": "healthy", "latencyMs": 9 },
    "audit": { "status": "healthy", "latencyMs": 14 },
    "ollama": { "status": "healthy", "latencyMs": 45 },
    "client-logs": { "status": "healthy", "latencyMs": 7 },
    "server-logs": { "status": "healthy", "latencyMs": 8 }
  },
  "timestamp": "2026-04-09T10:30:00.000Z"
}
```
