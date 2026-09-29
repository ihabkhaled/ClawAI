# Service Guide: claw-memory-service

## Overview

| Property     | Value                                           |
| ------------ | ----------------------------------------------- |
| Port         | 4005                                            |
| Database     | PostgreSQL (`claw_memory`) + pgvector           |
| ORM          | Prisma 5.20 (postgresqlExtensions)              |
| Env prefix   | `MEMORY_`                                       |
| Nginx routes | `/api/v1/memories/*`, `/api/v1/context-packs/*` |

The memory service provides long-term memory for conversations. It extracts facts, preferences, and instructions from completed messages using Ollama, stores them as user-scoped records, and assembles context packs for retrieval during message processing.

## Database Schema

### MemoryRecord

| Column          | Type       | Notes                                  |
| --------------- | ---------- | -------------------------------------- |
| id              | String     | CUID primary key                       |
| userId          | String     | Owner (indexed)                        |
| type            | MemoryType | FACT, PREFERENCE, INSTRUCTION, SUMMARY |
| content         | String     | The extracted memory text              |
| sourceThreadId  | String?    | Thread the memory came from            |
| sourceMessageId | String?    | Message the memory came from           |
| isEnabled       | Boolean    | User can disable specific memories     |
| createdAt       | DateTime   | Auto-set                               |
| updatedAt       | DateTime   | Auto-updated                           |

### ContextPack

| Column      | Type    | Notes                         |
| ----------- | ------- | ----------------------------- |
| id          | String  | CUID primary key              |
| userId      | String  | Owner                         |
| name        | String  | Pack name (e.g., "Project X") |
| description | String? | What this pack contains       |
| scope       | String? | Scope identifier              |

### ContextPackItem

| Column        | Type    | Notes                                |
| ------------- | ------- | ------------------------------------ |
| id            | String  | CUID primary key                     |
| contextPackId | String  | FK to ContextPack (cascading delete) |
| type          | String  | Item type (text, file reference)     |
| content       | String? | Inline text content                  |
| fileId        | String? | Reference to file-service file       |
| sortOrder     | Int     | Display/assembly order               |

## Memory Extraction Pipeline

When the memory service receives a `message.completed` event:

0. Skips the turn entirely when the payload's `useMemory` is `false` (the chat
   has **Use memory** off — SEC-006; absent means on), then when the user has
   paused all memory (`memory_preferences.pausedAll`).
1. Extracts the message content and metadata
2. Sends the content to the configured extraction model (default: `gemma3:4b`, configurable via `MEMORY_EXTRACTION_MODEL`)
3. The extraction prompt asks Ollama to identify:
   - **FACT** -- factual information the user shared about themselves or their work
   - **PREFERENCE** -- stated preferences (e.g., "I prefer TypeScript over JavaScript")
   - **INSTRUCTION** -- standing instructions (e.g., "Always use metric units")
   - **SUMMARY** -- key takeaways from the conversation
4. Performs deduplication check against existing memories for the user
5. Stores new unique memories as MemoryRecord entries
6. Publishes `memory.extracted` event

## API Endpoints

### Memories (`/api/v1/memories`)

| Method | Path | Description                                          |
| ------ | ---- | ---------------------------------------------------- |
| GET    | /    | List user's memories (paginated, filterable by type) |
| POST   | /    | Create memory manually                               |
| PATCH  | /:id | Update memory content or toggle enabled              |
| DELETE | /:id | Delete a memory record                               |

### Context Packs (`/api/v1/context-packs`)

| Method | Path               | Description               |
| ------ | ------------------ | ------------------------- |
| GET    | /                  | List user's context packs |
| POST   | /                  | Create context pack       |
| GET    | /:id               | Get pack with items       |
| PATCH  | /:id               | Update pack metadata      |
| DELETE | /:id               | Delete pack and all items |
| POST   | /:id/items         | Add item to pack          |
| PATCH  | /:id/items/:itemId | Update item               |
| DELETE | /:id/items/:itemId | Remove item from pack     |

### Internal API (service-to-service)

| Method | Path                          | Description                           |
| ------ | ----------------------------- | ------------------------------------- |
| GET    | /internal/memories/:userId    | Fetch user memories (limit 20)        |
| GET    | /internal/packs/:packId/items | Fetch pack items for context assembly |

## pgvector Integration

The database is configured with the pgvector extension for future semantic search capabilities. The Prisma schema uses `previewFeatures = ["postgresqlExtensions"]` and `extensions = [pgvector(map: "vector")]`.

## Events

| Event             | Direction | Notes                             |
| ----------------- | --------- | --------------------------------- |
| message.completed | Subscribe | Triggers memory extraction        |
| memory.extracted  | Publish   | Audit trail of extraction results |

## Context Assembly (Consumer Side)

When the chat service assembles context, it calls the memory service's internal API to:

1. Fetch the user's enabled memories (up to 20, most recent first)
2. Fetch items for each attached context pack
3. These are injected into the prompt between the system prompt and conversation history

## Large content, masking and chat delivery (2026-09-29, ADR-127)

- **Limits:** memory content and pack item content accept up to 250,000 characters (`MEMORY_CONTENT_MAX_CHARS`, `CONTEXT_PACK_ITEM_CONTENT_MAX_CHARS`). The JSON body limit is 4 MB (`MEMORY_SERVICE_BODY_LIMIT` in `main.ts`); Express's 100 KB default used to cap every write near 100K characters.
- **Masking:** `maskSecrets()` masks secret-shaped spans in place over the whole text and never shortens it. A REDACTED memory is stored masked and retrieved masked (never `null`).
- **Updates:** `PATCH /memories/:id` accepts `type`; changed content is re-classified and re-embedded.
- **Chat delivery:** `POST /api/v1/internal/context-packs/for-chat` (service token) with `{ userId, threadId?, packIds[] }` returns `{ packs: [{ id, name, autoApplied, items: [{ id, itemType, content }] }] }` — attached packs plus enabled, un-paused USER-scope packs and THREAD-scope packs for that thread. Chat-service ranks chunks of large items against the question (rules/57).

### Save from chat (2026-09-29)

- `POST /api/v1/internal/memories/save-from-chat` `{ userId, type, content, sourceThreadId, sourceMessageId }` → `{ memory, created }`. Idempotent: an existing memory with the same `(userId, sourceMessageId)` is returned. Same masking, plan gate and item limit as a manual create.
- `POST /api/v1/internal/context-packs/save-from-chat` `{ userId, name, content, sourceMessageId }` → `{ created, packId, name }`. Creates a USER-scope pack (on for every chat) with one MARKDOWN item, tagged `chat:<messageId>` as the idempotency key.
