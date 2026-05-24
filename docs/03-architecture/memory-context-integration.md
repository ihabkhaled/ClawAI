# Memory + Context Integration Architecture (V2)

## Why this document exists

Memory V2, Context V2, and the Memory + Context Integration V2 ship together as one trust surface. This document is the canonical narrative for how they fit together inside ClawAI's existing services — no new microservice, no new top-level page, all changes layered on `claw-memory-service` and `claw-chat-service`.

## The big picture

```
+----------------+         +----------------------------+         +---------------------+
|  /memory (FE)  | <-----> | claw-memory-service        | <-----> | PostgreSQL          |
|  /context (FE) |         |  - memories                |         | (claw_memory)       |
|  /chat   (FE)  |         |  - memory_suggestions      |         |  + pgvector         |
+--------+-------+         |  - memory_audit_logs       |         +---------------------+
         |                 |  - memory_usages           |
         |                 |  - memory_preferences      |
         |                 |  - context_packs (+items)  |
         |                 |  - context_pack_versions   |
         |                 |  - context_pack_usages     |
         |                 |  - context_pack_attachments|
         |                 |  - context_pack_templates  |
         |                 +-------------+--------------+
         |                               |
         |        RabbitMQ events        |        HTTP `/internal/memories/retrieve`
         |        memory.*, context.*    |        HTTP `/internal/memories/record-usage`
         v                               v
+--------------------+         +----------------------------+
|  audit-service     | <-----  |  claw-chat-service         |
|  (MongoDB)         |         |  - chat_threads            |
+--------------------+         |    + useMemory / useContext|
                               |  - chat_messages           |
                               |  - chat_message_context_   |
                               |    receipts (V2)           |
                               +----------------------------+
```

## What changed

### Memory V2

- New columns on `MemoryRecord`: `scope`, `scopeRef`, `tags`, `category`, `priority`, `confidence`, `source`, `sensitivity`, `retentionPolicy`, `expiresAt`, `pinned`, `pausedUntil`, `qualityScore`, `useCount`, `lastUsedAt`, `provenanceJson`.
- New tables: `memory_suggestions`, `memory_usages`, `memory_audit_logs`, `memory_preferences`.
- New enums (Prisma + shared-types + per-service): `MemoryScope`, `MemorySource`, `MemorySensitivity`, `MemoryRetention`, `MemorySuggestionStatus`, `MemoryAuditAction`.
- New managers: `MemorySensitivityManager` (regex pre-filter + soft hints).
- New services: `MemorySuggestionService`, `MemoryPreferenceService`, `MemoryAuditService`, `MemoryUsageService`, `MemoryRetrievalService`.
- New controllers: `MemorySuggestionsController`, `MemoryPreferencesController`, `MemoryAuditController`, `MemoryUsageController`, `MemoryRetrievalController` (internal).
- AI extraction (`MESSAGE_COMPLETED` consumer) now writes `MemorySuggestion` rows with sensitivity verdicts. Auto-approve runs only for `NORMAL` + confidence ≥ `MEMORY_AUTO_APPROVE_DEFAULT`.

### Context V2

- New columns on `ContextPack`: `scope` (enum), `scopeRef`, `legacyScope` (preserves v1 free-text), `tags`, `visibility`, `isEnabled`, `pausedUntil`, `pinned`, `color`, `icon`, `version`, `templateId`, `ownerUserId`, `useCount`, `lastUsedAt`, `qualityScore`.
- New columns on `ContextPackItem`: `itemType` (enum), `legacyType` (preserves v1 free-text), `url`, `memoryRefId`, `isEnabled`, `pinned`, `tokenCountEstimate`, `compressedSummary`.
- New tables: `context_pack_versions`, `context_pack_usages`, `context_pack_attachments`, `context_pack_templates`.
- New enums: `ContextPackScope`, `ContextPackItemType`, `ContextPackVisibility`.

### Integration V2

- New columns on `ChatThread`: `useMemory`, `useContext` (both default `true`).
- New table: `chat_message_context_receipts` (one per assistant message that used context).
- New module: `claw-chat-service/src/modules/context-receipts/` (repo + service + controller).
- New endpoint: `GET /chat-messages/:id/context-receipt`.
- Shared types: `RetrievalBundle`, `RetrievalRequest`, `RetrievalReason`, `ContextReceipt`.

## RabbitMQ events (V2 additions)

| Pattern                         | Publisher      | Audit consumer |
| ------------------------------- | -------------- | -------------- |
| `memory.suggested`              | memory-service | yes            |
| `memory.approved`               | memory-service | yes            |
| `memory.rejected`               | memory-service | yes            |
| `memory.used`                   | memory-service | yes            |
| `memory.forgotten`              | memory-service | yes            |
| `memory.paused`                 | memory-service | yes            |
| `memory.redacted`               | memory-service | yes            |
| `context_pack.created`          | memory-service | yes            |
| `context_pack.updated`          | memory-service | yes            |
| `context_pack.deleted`          | memory-service | yes            |
| `context_pack.attached`         | memory-service | yes            |
| `context_pack.detached`         | memory-service | yes            |
| `context_pack.used`             | memory-service | yes            |
| `context_pack.version_created`  | memory-service | yes            |
| `context_pack.version_reverted` | memory-service | yes            |
| `context_pack.shared`           | memory-service | yes            |
| `context.receipt_written`       | chat-service   | yes            |
| `chat_thread.memory_toggled`    | chat-service   | yes            |
| `chat_thread.context_toggled`   | chat-service   | yes            |

## Retrieval flow (assistant turn)

1. Chat-service builds `RetrievalRequest` from `ChatThread.userId/threadId/workspaceId/projectId/useMemory/useContext`, attached pack ids, attached memory ids, and the user's latest message.
2. `POST /internal/memories/retrieve` returns a `RetrievalBundle` containing scope-filtered memories ranked by intent overlap + pinned/preference priority, plus pack items (scope-filtered + cosine-ranked when embeddings exist).
3. Chat-service assembles the prompt from the bundle (priority order: system → research → files → pinned context → ranked context → preferences → facts → workspace → history).
4. Chat-service writes a `ChatMessageContextReceipt` row capturing the bundle.
5. Audit-service consumes `CONTEXT_RECEIPT_WRITTEN`.
6. Frontend reads the receipt via `GET /chat-messages/:id/context-receipt`.

## Privacy invariants (testable)

- **Cross-user isolation**: every retrieval enforces `userId` at the query layer. Receipts are read-restricted to their owner.
- **Scope isolation**: `findByUserScopeForRetrieval` only OR-includes scopes the request's caller can reach. THREAD-scope memories never appear in unrelated threads.
- **REDACTED handling**: raw redacted content is never persisted. The retrieval bundle returns `content: null` + sensitivity badge for REDACTED memories.
- **Audit row survival**: `memory_audit_logs.memoryId` is nullable so audit history outlives the underlying row (Right To Be Forgotten compliance).
- **Pause respected**: global pause (`memory_preferences.pausedAll`) and per-memory pause (`pausedUntil > now()`) both skip retrieval AND extraction.

## Feature flags

- `MEMORY_V2_ENABLED` — env-level master flag; defaults true. V1 endpoints remain live regardless.
- `CONTEXT_V2_ENABLED` — same.
- `RETRIEVAL_V2_ENABLED` — gates the new retrieval endpoint; chat-service falls back to v1 `/internal/memories/for-context` if disabled.

## Where the receipts live (and what the user sees)

- A small "context used" icon appears on each assistant message bubble in chat. (Wiring follow-up — the receipt API + table are in place; the icon is staged for a UI follow-up so it does not interleave with the parallel-running streams.)
- The Suggestions tab on `/memory` is the front-of-house surface for the queue.
- The Audit tab on `/memory` reads the per-user audit timeline.

## Out of scope for V2 (deferred to follow-up sessions, documented in the planning pack)

- Sensitivity classifier Ollama call (regex pre-filter ships; Ollama fallback enqueued).
- Memory + context-pack embedding manager (schema + retrieval endpoint scaffold land in V2; cosine ranking lands once embedding pipeline is wired).
- Compose-time preview popover (read endpoint is ready; popover UI deferred).
- Context-pack version revert + diff modal (table + retention policy land; UI deferred).
- Import/export NDJSON endpoints (Phase 3 release slice).
