# ADR-024 — Unified Cross-Provider Inbox + pgvector Semantic Search

**Status:** Accepted (2026-05-01)
**Stream:** 30

## Context

A user with Gmail + Slack + Jira + GitHub connected has four separate workspace pages. The "what needs my attention" question forces them to triage four feeds. We need a single cross-provider inbox with rich filtering, plus semantic search that doesn't leak to cloud LLMs (privacy-preserving by default).

## Decision

### Inbox: server-paginated query over `WorkspaceObject`

`apps/claw-workspace-service/src/modules/inbox/`:

- `GET /workspace/inbox?providers=GMAIL,JIRA&types=EMAIL,TICKET&dateFrom=…&cursor=…&limit=25`
- Cursor format: `<isoDate>__<id>` for stable sort (`externalUpdatedAt DESC, id DESC`).
- 30-day default lookback, configurable.
- Response shape: `{ items, nextCursor, totalCount }` with content snippet (240 chars) plus the metadata `hasSuggestion` flag.

No new tables — the query is a filtered/paginated select over the existing `WorkspaceObject` table. The composite index on `(userId, type, syncedAt desc)` from earlier streams keeps the query under 50 ms for ≤100k objects per user.

### Semantic search: pgvector embeddings in memory-service

The decision: **embeddings live in memory-service**, not workspace-service. Memory-service already has pgvector, owns the OS quirks of `pgvector` migrations + `<=>` cosine operator, and is where the rest of user-scoped vector data lives.

`apps/claw-memory-service/prisma/schema.prisma` adds:

```prisma
model WorkspaceObjectEmbedding {
  id                String   @id @default(cuid())
  workspaceObjectId String   @db.VarChar(128)
  userId            String   @db.VarChar(128)
  provider          String   @db.VarChar(64)
  objectType        String   @db.VarChar(64)
  contentHash       String   @db.VarChar(64)
  contentSnippet    String   @db.VarChar(2048)
  embedding         Unsupported("vector(768)")
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
  @@unique([workspaceObjectId, contentHash])
  @@index([userId])
  @@index([provider])
}
```

- Dimension 768 matches `nomic-embed-text` Ollama default. Configurable via `EMBEDDING_DIMENSIONS`.
- Dedup via `(workspaceObjectId, contentHash)` unique — same content not re-embedded.
- ANN index: `ivfflat (embedding vector_cosine_ops) WITH (lists = 100)` — sized for ~10k embeddings/user.

### Endpoints

memory-service:
- `POST /api/v1/internal/embeddings/upsert-workspace-object` — service-to-service from workspace.
- `POST /api/v1/internal/embeddings/search-workspace-objects` — cosine search (`1 - (embedding <=> query)` as score).
- `POST /api/v1/internal/embeddings/delete-by-object-id` — cascade on workspace-object delete.

workspace-service:
- `POST /workspace/inbox/search` — auth-required; proxies to memory-service `/embeddings/search-workspace-objects` then hydrates results from the local `WorkspaceObject` table for title/url/authorId.

### Wrapper utility

`apps/claw-memory-service/src/modules/embeddings/utilities/ollama-embeddings.utility.ts` wraps the Ollama `/api/embeddings` HTTP call and computes the SHA-256 content hash for dedup. Never inline.

## Consequences

- **Privacy-preserving**: embeddings are computed by local Ollama (`nomic-embed-text`) — never sent to a cloud LLM.
- **Schema isolation**: workspace-service has zero new tables for search; memory-service owns the vector storage. If we ever want to swap pgvector for a managed vector DB, only memory-service changes.
- **Hybrid scoring (deferred)**: v1 scores by raw cosine; v1.x will combine with recency for better small-query relevance.
- **Bandwidth**: each new/updated workspace object triggers one `/api/embeddings` call to Ollama (typical 100–300 ms). Acceptable for current sync volumes.
- **Search log redaction**: pino redact list includes `body.query` so query text is never logged at info level.

## Verification

- `qa/test-stream-30-inbox-search.sh` confirms inbox auth, embedding table presence, pgvector extension installed, and Docker log cleanliness.
- 5 new endpoints, 2 new services + repository + types/constants, all backed by the existing PrismaModule + AppConfig stack.
