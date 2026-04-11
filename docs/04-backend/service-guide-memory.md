# Service Guide: claw-memory-service

## Overview

| Property       | Value                              |
| -------------- | ---------------------------------- |
| Port           | 4005                               |
| Database       | PostgreSQL (`claw_memory`) + pgvector |
| ORM            | Prisma 5.20 (postgresqlExtensions) |
| Env prefix     | `MEMORY_`                          |
| Nginx routes   | `/api/v1/memories/*`, `/api/v1/context-packs/*` |

The memory service provides long-term memory for conversations. It extracts facts, preferences, and instructions from completed messages using Ollama, stores them as user-scoped records, and assembles context packs for retrieval during message processing.

## Database Schema

### MemoryRecord

| Column          | Type       | Notes                             |
| --------------- | ---------- | --------------------------------- |
| id              | String     | CUID primary key                  |
| userId          | String     | Owner (indexed)                   |
| type            | MemoryType | FACT, PREFERENCE, INSTRUCTION, SUMMARY |
| content         | String     | The extracted memory text         |
| sourceThreadId  | String?    | Thread the memory came from       |
| sourceMessageId | String?    | Message the memory came from      |
| isEnabled       | Boolean    | User can disable specific memories|
| createdAt       | DateTime   | Auto-set                          |
| updatedAt       | DateTime   | Auto-updated                      |

### ContextPack

| Column      | Type    | Notes                           |
| ----------- | ------- | ------------------------------- |
| id          | String  | CUID primary key                |
| userId      | String  | Owner                           |
| name        | String  | Pack name (e.g., "Project X")   |
| description | String? | What this pack contains         |
| scope       | String? | Scope identifier                |

### ContextPackItem

| Column        | Type   | Notes                                |
| ------------- | ------ | ------------------------------------ |
| id            | String | CUID primary key                     |
| contextPackId | String | FK to ContextPack (cascading delete) |
| type          | String | Item type (text, file reference)     |
| content       | String?| Inline text content                  |
| fileId        | String?| Reference to file-service file       |
| sortOrder     | Int    | Display/assembly order               |

## Memory Extraction Pipeline

When the memory service receives a `message.completed` event:

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

| Method | Path       | Description                          |
| ------ | ---------- | ------------------------------------ |
| GET    | /          | List user's memories (paginated, filterable by type) |
| POST   | /          | Create memory manually               |
| PATCH  | /:id       | Update memory content or toggle enabled |
| DELETE | /:id       | Delete a memory record               |

### Context Packs (`/api/v1/context-packs`)

| Method | Path              | Description                    |
| ------ | ----------------- | ------------------------------ |
| GET    | /                 | List user's context packs      |
| POST   | /                 | Create context pack            |
| GET    | /:id              | Get pack with items            |
| PATCH  | /:id              | Update pack metadata           |
| DELETE | /:id              | Delete pack and all items      |
| POST   | /:id/items        | Add item to pack               |
| PATCH  | /:id/items/:itemId| Update item                    |
| DELETE | /:id/items/:itemId| Remove item from pack          |

### Internal API (service-to-service)

| Method | Path                         | Description                        |
| ------ | ---------------------------- | ---------------------------------- |
| GET    | /internal/memories/:userId   | Fetch user memories (limit 20)     |
| GET    | /internal/packs/:packId/items| Fetch pack items for context assembly |

## pgvector Integration

The database is configured with the pgvector extension for future semantic search capabilities. The Prisma schema uses `previewFeatures = ["postgresqlExtensions"]` and `extensions = [pgvector(map: "vector")]`.

## Events

| Event             | Direction | Notes                                |
| ----------------- | --------- | ------------------------------------ |
| message.completed | Subscribe | Triggers memory extraction           |
| memory.extracted  | Publish   | Audit trail of extraction results    |

## Context Assembly (Consumer Side)

When the chat service assembles context, it calls the memory service's internal API to:

1. Fetch the user's enabled memories (up to 20, most recent first)
2. Fetch items for each attached context pack
3. These are injected into the prompt between the system prompt and conversation history
