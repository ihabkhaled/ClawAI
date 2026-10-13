# Claw Memory Service - Development Rules

## Service Overview

This is the Memory microservice for the Claw platform. It owns memory records and context packs.

## Ownership

- **Memory Records**: CRUD operations for user memories (summaries, facts, preferences, instructions)
- **Context Packs**: CRUD operations for context packs and their items

## Tech Details

- **Port**: 4005
- **Database**: PostgreSQL (`claw_memory`) with pgvector extension
- **Cache**: Redis (shared)
- **Message Broker**: RabbitMQ (shared)

## Tables Owned

- `memory_records` (V2: + scope/scopeRef/tags/category/priority/confidence/source/sensitivity/retentionPolicy/expiresAt/pinned/pausedUntil/qualityScore/useCount/lastUsedAt/provenanceJson)
- `memory_suggestions` (V2 — suggestion queue gated by user approval / auto-approve threshold)
- `memory_usages` (V2 — per-message retrieval telemetry)
- `memory_audit_logs` (V2 — survives memory row deletion; one row per CRUD/use/approve/reject action)
- `memory_preferences` (V2 — per-user pausedAll, autoApproveThreshold, defaultRetention, defaultExpiresInDays, redactByDefault)
- `context_packs` (V2: + scope enum/scopeRef/legacyScope/tags/visibility/isEnabled/pausedUntil/pinned/color/icon/version/templateId/ownerUserId/useCount/lastUsedAt/qualityScore)
- `context_pack_items` (V2: + itemType enum/legacyType/url/memoryRefId/isEnabled/pinned/tokenCountEstimate/compressedSummary)
- `context_pack_versions` (V2 — immutable history of pack edits; pruned at CONTEXT_VERSION_RETENTION_COUNT)
- `context_pack_usages` (V2 — per-message pack retrieval log)
- `context_pack_attachments` (V2 — many-to-many between packs and scope+scopeRef)
- `context_pack_templates` (V2 — system + user-created templates)

## V2 Modules Layout

```
src/modules/
  memory/                     # Memory CRUD + retrieval + extraction (existing, extended)
  memory-suggestions/         # NEW: suggestion queue (approve / reject / bulk / dismiss)
  memory-preferences/         # NEW: per-user pausedAll / autoApproveThreshold / defaults
  memory-audit/               # NEW: per-memory + per-user audit timeline
  memory-usage/               # NEW: usage telemetry queries
  context-packs/              # Existing, extended for scopes / visibility / attachments / versions
  embeddings/                 # Existing — backs workspace + (future) pack/memory embeddings
```

The retrieval endpoint `POST /internal/memories/retrieve` is the canonical entry point for chat-service. It returns a `RetrievalBundle` (shared-types) with scope-filtered + sensitivity-sanitized memories and pack items. `POST /internal/memories/record-usage` writes the corresponding `memory_usages` rows and emits `MEMORY_USED` events.

## V2 Sensitivity Rules (non-negotiable)

- `MemorySensitivityManager.classify(content)` runs on EVERY new memory before persistence (manual create and auto-extract).
- Hits for `aws_access_key`, `aws_secret_key`, `private_key_block`, `jwt`, `ssn_us`, `credit_card`, `google_api_key`, `github_token`, `openai_key` → verdict `REDACTED`, content is masked to `XX*****YYYY` before write.
- Masking is `maskSecrets()` (`common/utilities/mask-secrets.utility.ts`): whole text, length-preserving, only the matched span starred. It NEVER returns a preview — the old `redact()` returned `slice(0, 256)` and that stub was stored as the memory (ADR-127, rules/57). `aws_secret_key` and `credit_card` carry an `accept` check (mixed case + digit; Luhn) because the bare regex matches URL paths and order numbers.
- Updates re-run the classifier when content changes; retrieval re-masks REDACTED rows and returns them — never `content: null`.
- Limits: `MEMORY_CONTENT_MAX_CHARS` / `CONTEXT_PACK_ITEM_CONTENT_MAX_CHARS` = 250,000; JSON body limit `MEMORY_SERVICE_BODY_LIMIT` = 4 MB in `main.ts`. Frontend mirrors them in `@/constants`.
- Chat reads packs ONLY via `POST /internal/context-packs/for-chat` (ServiceTokenGuard; `userId` in every WHERE branch; attached ids + USER-scope + THREAD-scope for the thread).
- Soft hints (`password`, `salary`, `medical`, …) → verdict `SENSITIVE` with confidence < 1.
- Auto-approve from the suggestion queue ONLY fires for verdict `NORMAL` AND confidence ≥ `memory_preferences.autoApproveThreshold` (default 0.85).

## Chat saves into an existing pack (2026-09-30, ADR-134)

Two service-token routes for chat-service's AI save path:
`POST /internal/context-packs/options-for-chat {userId}` → the user's packs
`[{id, name, itemCount, updatedAt}]`, newest first, 50 max; and
`POST /internal/context-packs/:id/items/from-chat {userId, content, sourceMessageId}`
→ adds one MARKDOWN item through `ContextPacksService.addItem`, which checks
ownership (someone else's pack → 403, never created instead). Both live in
`ContextPackChatService` (the pack service is past its size ceiling).
`from-chat` is idempotent: the same text already in that pack returns the
existing item (a regenerated save turn saves again) — looked up only for the
pack's owner.

## A chat with memory off is not a memory source (SEC-006, 2026-09-30)

`message.completed` carries the thread's `useMemory`. `handleMessageCompleted`
returns before extraction when it is `false`, and treats an absent field as on
(an older publisher). Before this, turning memory off in a chat stopped
memories being injected into it but still extracted — and could auto-approve —
new memories from it. `pausedAll` (the account-wide switch) is still checked
after it. Tests: `memory.service.spec.ts` "learning from a completed chat turn".

## Media-derived text (pack §59)

**Rule (owner decision):** raw voice-note transcripts, `DERIVED IMAGE OBSERVATIONS` blocks
(`<<<BEGIN/END DERIVED OBSERVATIONS>>>`), `VIDEO:` transcript blocks, TTS spoken text and any
file `extractedText` are never stored as durable memory automatically. User-authored text stays
eligible.

**Audit (2026-09-26): holds today with no stripping code.** Auto-extraction has exactly one input:
the `message.completed` event (`MemoryService.handleMessageCompleted` → `MemoryExtractionManager.extract`).
It reads only two payload fields:

- `userContent` — the stored `ChatMessage.content` of the last USER row (chat-service
  `ChatMessagesService.publishMessageCompleted`). That is the typed text only. Attachment-only
  sends store an empty row; the attachment-only lead, the `VOICE NOTE "<name>": …` frame, the
  derived-observation block and the `VIDEO:` block are all built per request in
  `ContextAssemblyManager` / the attachment-only utility and are never persisted to the row.
- `content` — the stored assistant reply: model-authored text. It may paraphrase or quote a
  transcript (a legitimate extraction source, same as any reply), but the framed blocks live in
  the system prompt, not the reply, so a delimiter appears there only if a model echoes it.

Memory-service never receives the assembled prompt or file text: no other service POSTs
conversation or file text to it, and context-pack items only store a `fileId` reference the user
added by hand. **If you ever add an extraction input that carries assembled prompts or file text,
strip the framed media blocks at that input first** (copy the marker literals from chat-service
`constants/vision-helper.constants.ts`, `voice-note.constants.ts`, `video-delivery.constants.ts`
with a comment naming the source; no shared-package dependency) and test it.

## Baseline rules

Baseline rules for every backend service (commands, absolute rules, declarations, library wrapping, Docker rebuild, workflow phases, checklists, output format): [docs/04-backend/backend-service-baseline.md](../../docs/04-backend/backend-service-baseline.md). This file adds only what is specific to `claw-memory-service`.

## Commands

The standard commands are in the baseline; the Prisma ones for this service:

```bash
npm run migrate          # Run migrations (production)
npm run migrate:dev      # Create + run migration (dev)
npm run prisma:generate  # Regenerate Prisma client
```
