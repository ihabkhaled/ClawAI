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
- Soft hints (`password`, `salary`, `medical`, …) → verdict `SENSITIVE` with confidence < 1.
- Auto-approve from the suggestion queue ONLY fires for verdict `NORMAL` AND confidence ≥ `memory_preferences.autoApproveThreshold` (default 0.85).

## All Standard Backend Rules Apply

See the root CLAUDE.md for the full set of architecture rules, naming conventions, and code quality requirements. Key points:

- NEVER use `any` — use `unknown`, generics, or proper types
- NEVER disable ESLint rules
- NEVER use `console.log` — use NestJS Logger
- NEVER use `process.env` directly — use AppConfig (Zod-validated)
- Controllers are 3-line methods: extract params, call ONE service, return
- Service methods max 30 lines
- Repositories are pure data access only
- All Zod schemas must have `.max()` on every string and array field
- All errors use `BusinessException` with a `messageKey`
- Every function must have an explicit return type

## No Inline Declarations Rule

**NEVER** define `type`, `interface`, `enum`, or module-level `const` inline in service, controller, repository, manager, adapter, utility, guard, filter, interceptor, pipe, or module files. Extract to dedicated files:

- Types/interfaces → `src/modules/<domain>/types/<name>.types.ts`
- Enums → `src/common/enums/<name>.enum.ts`
- Constants → `src/modules/<domain>/constants/<name>.constants.ts`
  Only exception: `private readonly logger = new Logger(...)` inside NestJS classes.

## Library Wrapping Rule

Every third-party library MUST be wrapped in a utility file under `src/common/utilities/`. Services and controllers NEVER import third-party packages directly — they import the wrapper. Example: `src/common/utilities/jwt.utility.ts` wraps `jsonwebtoken`, and services import `{ signToken, verifyToken }` from the wrapper.

## Commands

```bash
npm run dev              # Start with hot reload
npm run build            # Production build
npm run typecheck        # Type check
npm run lint             # ESLint
npm run test             # Unit tests
npm run migrate          # Run migrations (production)
npm run migrate:dev      # Create + run migration (dev)
npm run prisma:generate  # Regenerate Prisma client
```

## Docker Container Rebuild Procedure

When rebuilding this service (especially after shared package changes):

```bash
./scripts/claw.sh stop memory-service
./scripts/claw.sh rm -f memory-service
docker rmi claw-memory-service
./scripts/claw.sh up -d --build memory-service
```

**NEVER skip steps.** See root CLAUDE.md for full explanation.

## Workflow Phase Requirements

All work on this service MUST follow the phases defined in the root `CLAUDE.md`:

- **Phase 0** (Planning Gate): Document impacted areas, risks, acceptance criteria before coding
- **Phase 0g** (Business Framing): Define user problem, success metrics, UAT seed for user-facing changes
- **Phase 1-3** (Implementation): Follow backend architecture rules above
- **Phase 4** (SSE rules if applicable): Apply SSE-specific patterns from root CLAUDE.md
- **Phase 5** (Error handling): All async errors stored + SSE emitted
- **Phase 8** (Validation): typecheck + lint + test + build before any commit
- **Phase 9** (API testing): Verify all new endpoints with curl/Postman before claiming done
- **Phase 12** (QE Gates): All phases from docs/16-quality-engineering/ must pass

## Pre-Implementation Checklist (this service)

Before writing code for this service:

- [ ] Read root CLAUDE.md
- [ ] Read this service CLAUDE.md
- [ ] Read existing service code for the area being changed
- [ ] Read current Prisma schema (if DB changes)
- [ ] Identify all RabbitMQ events published/consumed by this service
- [ ] Check if shared packages need updating

## Post-Implementation Checklist (this service)

After implementing any change to this service:

- [ ] `npm run typecheck` → 0 errors
- [ ] `npm run lint` → 0 errors
- [ ] `npm run test` → all pass
- [ ] `npm run build` → success
- [ ] All new Zod DTOs have: max() on strings, max() on arrays, required fields explicit
- [ ] All new service methods are ≤ 30 lines
- [ ] All new manager methods are ≤ 80 lines
- [ ] All new controllers are 3-line methods
- [ ] No try/catch in controllers
- [ ] No Prisma calls outside repositories
- [ ] All new events published using RabbitMQService
- [ ] All new messageKeys added to error catalog
- [ ] All background tasks use fire-and-forget with `void`
- [ ] All fire-and-forget error paths: `emitError` → `storeErrorMessage` in nested try-catch
- [ ] All poll-detected flows store metadata `{ error: true }` on failure

## Required Output Format

After completing any implementation task on this service, produce:

1. **Files changed** (list with purpose of each change)
2. **Tests added/updated** (list with what each test covers)
3. **API changes** (new endpoints, changed contracts)
4. **Infrastructure changes** (env vars, Docker, Nginx, CI)
5. **Known gaps or follow-up items**
6. **Evidence**: typecheck output, lint output, test output
