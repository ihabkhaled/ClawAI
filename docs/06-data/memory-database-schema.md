# Memory Database Schema (claw_memory)

PostgreSQL database with pgvector extension for the memory service (port 5445). Stores user memories, context packs, and pack items.

---

## Connection

```
Database: claw_memory
Port: 5445 (host) / 5432 (container)
URL: postgresql://claw:claw_secret@pg-memory:5432/claw_memory?schema=public
Prisma schema: apps/claw-memory-service/prisma/schema.prisma
Extensions: pgvector
```

---

## Tables

### memory_records

Stores extracted or manually created user memories.

| Column | Type | Nullable | Default | Constraints | Description |
|--------|------|----------|---------|-------------|-------------|
| id | String (CUID) | NO | `cuid()` | PK | Memory identifier |
| user_id | String | NO | - | - | Owning user ID |
| type | MemoryType enum | NO | - | - | FACT, PREFERENCE, INSTRUCTION, SUMMARY |
| content | String | NO | - | - | Memory text content |
| source_thread_id | String | YES | - | - | Thread where memory was extracted from |
| source_message_id | String | YES | - | - | Message where memory was extracted from |
| is_enabled | Boolean | NO | `true` | - | Whether memory is active |
| created_at | DateTime | NO | `now()` | - | Creation timestamp |
| updated_at | DateTime | NO | auto | - | Last update timestamp |

**Indexes**:
- `user_id` — memories by user
- `type` — filter by memory type
- `is_enabled` — active memories

### context_packs

Named collections of context items that can be attached to threads.

| Column | Type | Nullable | Default | Constraints | Description |
|--------|------|----------|---------|-------------|-------------|
| id | String (CUID) | NO | `cuid()` | PK | Pack identifier |
| user_id | String | NO | - | - | Owning user ID |
| name | String | NO | - | - | Pack display name |
| description | String | YES | - | - | Pack description |
| scope | String | YES | - | - | Usage scope hint |
| created_at | DateTime | NO | `now()` | - | Creation timestamp |
| updated_at | DateTime | NO | auto | - | Last update timestamp |

**Indexes**:
- `user_id` — packs by user

**Relations**:
- `items` — one-to-many with ContextPackItem (cascade delete)

### context_pack_items

Individual items within a context pack.

| Column | Type | Nullable | Default | Constraints | Description |
|--------|------|----------|---------|-------------|-------------|
| id | String (CUID) | NO | `cuid()` | PK | Item identifier |
| context_pack_id | String | NO | - | FK -> context_packs.id | Parent pack |
| type | String | NO | - | - | Item type (text, file, instruction) |
| content | String | YES | - | - | Text content (if type=text) |
| file_id | String | YES | - | - | File ID from file-service (if type=file) |
| sort_order | Int | NO | `0` | - | Display/processing order |
| created_at | DateTime | NO | `now()` | - | Creation timestamp |

**Indexes**:
- `context_pack_id` — items in a pack
- `sort_order` — ordered retrieval

---

## Enums

### MemoryType
```
FACT        — Factual information about the user (e.g., "works at Google")
PREFERENCE  — User preferences (e.g., "prefers TypeScript over JavaScript")
INSTRUCTION — Standing instructions (e.g., "always explain code step by step")
SUMMARY     — Conversation summaries
```

---

## Memory Extraction Flow

1. `message.completed` event received from chat-service
2. Memory extraction manager calls Ollama with extraction prompt
3. Ollama identifies FACT/PREFERENCE/INSTRUCTION/SUMMARY items
4. Deduplication check against existing memories for the user
5. New memories stored in `memory_records`
6. `memory.extracted` event published for audit

---

## Context Assembly Flow

When the chat service assembles context for an AI call:

1. Fetch enabled memories: `GET /internal/memories/for-context?userId=X&limit=20`
2. For each context pack attached to the thread:
   - Fetch pack items: `GET /internal/context-packs/:id/items`
3. Build prompt: system prompt -> memories -> pack items -> file chunks -> thread history

---

## pgvector Extension

The database is configured with the pgvector extension for future vector similarity search:

```prisma
datasource db {
  provider   = "postgresql"
  extensions = [pgvector(map: "vector")]
}
```

Currently used for the extension setup. Future use: semantic memory search via embedding vectors.

---

## Cascade Delete Chain

```
ContextPack (delete)
  -> ContextPackItem (cascade)
```

Memory records have no cascade dependencies — they are standalone.
