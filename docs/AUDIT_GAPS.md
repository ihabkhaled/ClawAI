# ClawAI — Audit Gaps (Phase 2 Documentation TODO)

> This file tracks documentation, testing, and audit items. Items marked [x] are complete.

## Phase 3 Status (2026-04-22): COMPLETED

The following root-level docs were updated in Phase 3:

- `README.md` — fixed service count (16), added research service (4016), fixed workspace port (4017)
- `INSTALL.md` — added research service container + DB, fixed workspace port (4017), 35-container count
- `ARCHITECTURE.md` — full rewrite: all 17 services, adapter factory table, SSE pattern, fire-and-forget pattern, chat-service 14-manager pipeline, routing 5-stage pipeline, end-to-end message flow
- `ENVIRONMENT_VARIABLES.md` — full rewrite: all 12 PG instances, all inter-service URLs, per-service ports, workspace OAuth vars, research vars, image/file-gen/agent/ClamAV vars
- `SECURITY.md` — full rewrite: 16-service secret table, file upload 4-check pipeline, workspace OAuth2/PKCE, agent terminal approval, RBAC 3 roles, helmet section, pino redaction
- `TESTING.md` — full rewrite: hard testing mandate (T1-T7), 8 delivery blockers, all 17 services in test tables, manual matrix expanded with research/workspace/agent

## Phase 2 Status (2026-04-22): COMPLETED

The following docs were created in Phase 2:

- `docs/04-backend/utilities-reference.md` — All 89 backend utilities cataloged by service
- `docs/04-backend/managers-reference.md` — All 47 managers across 17 services
- `docs/04-backend/adapters-reference.md` — All 33 adapters (connector, image, file-gen, ollama, research, workspace)
- `docs/04-backend/shared-packages-reference.md` — Updated (already existed)
- `docs/04-backend/service-guide-workspace.md` — Workspace service architecture
- `docs/04-backend/patterns/adapter-factory-pattern.md` — Factory pattern documentation
- `docs/04-backend/patterns/sse-streaming-pattern.md` — SSE with gotchas
- `docs/04-backend/patterns/fire-and-forget-error-pattern.md` — Async error storage
- `docs/04-backend/patterns/controlled-model-selector-pattern.md` — Frontend state sync
- `docs/05-frontend/utilities-reference.md` — All 29 frontend utilities
- `docs/07-integrations/packages/backend-packages.md` — Backend npm packages
- `docs/07-integrations/packages/frontend-packages.md` — Frontend npm packages
- CLAUDE.md updated: added claw-workspace-service to workspace layout
- rules/ folder: 9 rule files created
- skills/ folder: 9 skill runbooks created

## Remaining Gaps (Phase 3)

---

## Priority 1 — Per-Utility Documentation (Backend)

For each `src/common/utilities/*.utility.ts` in every service, create:
`docs/04-backend/utilities/<service>/<utility-name>.md`

### claw-connector-service utilities

- [ ] `http.utility.ts` — httpGet, httpGetText wrappers (wraps node fetch)
- [ ] `encryption.utility.ts` — AES-256-GCM encrypt/decrypt for connector secrets
- [ ] `jwt.utility.ts` — JWT verification for service-to-service auth

### claw-chat-service utilities

- [ ] `sse.utility.ts` — Server-Sent Events emission patterns
- [ ] `token-budget.utility.ts` — Context window truncation logic
- [ ] `context-assembly.utility.ts` — Memory + files + packs + history assembly

### claw-routing-service utilities

- [ ] `keyword-classifier.utility.ts` — 1650+ keyword matching for 33 capability classes
- [ ] `prompt-builder.utility.ts` — Dynamic router prompt construction

### claw-file-service utilities

- [ ] `file-security.utility.ts` — FileSecurityManager (antivirus, magic bytes, filename, zip-bomb)
- [ ] `chunker.utility.ts` — JSON/CSV/MD/text chunking strategies

### claw-memory-service utilities

- [ ] `embedding.utility.ts` — pgvector embedding generation via Ollama
- [ ] `dedup.utility.ts` — Memory deduplication logic

### claw-frontend utilities

- [ ] `sse.utility.ts` — SSE client using fetch() (NOT EventSource)
- [ ] `format.utility.ts` — Date, number, token count formatters
- [ ] `model-display.utility.ts` — Model name formatting and display logic

---

## Priority 2 — Per-NPM-Package Documentation

For each key third-party dependency, create:
`docs/07-integrations/packages/<package-name>.md`

Document: why we use it, what we wrap it with, gotchas, version pinned.

### Backend Packages

- [ ] `@nestjs/microservices` — RabbitMQ consumer pattern
- [ ] `prisma` + `@prisma/client` — ORM, migration workflow, pgvector
- [ ] `zod` — DTO validation, schema-first types
- [ ] `pino` / `nestjs-pino` — Structured logging with redaction
- [ ] `ioredis` — Redis client wrapper
- [ ] `amqplib` — RabbitMQ connection via shared-rabbitmq
- [ ] `argon2` — Password hashing (not bcrypt)
- [ ] `jsonwebtoken` — JWT sign/verify
- [ ] `@nestjs/throttler` — Rate limiting
- [ ] `helmet` — Security headers

### Frontend Packages

- [ ] `@tanstack/react-query` — Server state, caching, mutation
- [ ] `zustand` — Client state (auth, sidebar, logs)
- [ ] `tailwindcss` + `class-variance-authority` — Styling
- [ ] `radix-ui/*` — Unstyled accessible primitives (used by shadcn)
- [ ] `zod` — Form validation schemas
- [ ] `lucide-react` — Icon library
- [ ] `next-intl` / custom i18n — Translation system

---

## Priority 3 — Per-Reusable-Module Documentation

For each shared or reusable module pattern, create or update:
`docs/04-backend/patterns/<pattern-name>.md`

### Backend Patterns

- [ ] `AdapterFactory` pattern (connector adapters)
- [ ] `ContextAssemblyManager` pipeline
- [ ] `ChatExecutionManager` + fallback chain
- [ ] `PromptBuilderManager` + dynamic routing
- [ ] `SSE Subject` pattern (real-time events)
- [ ] `Fire-and-forget + error storage` pattern
- [ ] `Polling stop condition` pattern (meta.error)

### Frontend Patterns

- [ ] `Controller hook` pattern (useXPage)
- [ ] `Query key factory` pattern
- [ ] `Mutation + invalidation` pattern
- [ ] `SSE utility + polling fallback` pattern
- [ ] `Controlled model selector` pattern (thread settings ↔ composer sync)

---

## Priority 4 — Per-Service API Reference

For each service, update `docs/12-reference/api-reference.md` with:

- All endpoints (method + path + description)
- Request body shape (Zod schema fields)
- Response body shape
- Error codes

Services needing full documentation:

- [ ] claw-connector-service (connectors, models, health, sync)
- [ ] claw-chat-service (threads, messages, parallel, feedback, regenerate)
- [ ] claw-routing-service (decisions, policies, evaluate, replay)
- [ ] claw-memory-service (memories, context-packs)
- [ ] claw-ollama-service (catalog, pull-jobs, local models)
- [ ] claw-file-service (upload, list, chunks)
- [ ] claw-research-service (providers, search runs)
- [ ] claw-agent-service (sessions, terminal, repos)
- [ ] claw-image-service (generations, retry)
- [ ] claw-file-generation-service (generations, export)

---

## Priority 5 — QA Script Coverage Gaps

These services have no `qa/test-<service>.sh` scripts yet:

- [ ] `qa/test-auth.sh`
- [ ] `qa/test-connectors.sh`
- [ ] `qa/test-chat.sh`
- [ ] `qa/test-routing.sh`
- [ ] `qa/test-memory.sh`
- [ ] `qa/test-files.sh`
- [ ] `qa/test-ollama.sh`
- [ ] `qa/test-research.sh`
- [ ] `qa/test-agent.sh`
- [ ] `qa/test-images.sh`
- [ ] `qa/test-file-generations.sh`

Template in `skills/05-qa-toolkit.md`.

---

## Priority 6 — DTO Fuzz Test Coverage

For each service's DTOs, create `apps/<service>/__tests__/dto/` with fuzz tests:

- [ ] connector DTOs (create, update, sync)
- [ ] chat DTOs (create thread, send message, update settings)
- [ ] routing DTOs (routing decision, policy create)
- [ ] memory DTOs (create memory, context pack)
- [ ] file DTOs (upload, delete)

---

## Notes

- Phase 2 work should happen per-service in dedicated sessions
- Document only what's non-obvious — code that reads clearly needs no doc
- Focus on WHY decisions were made and WHAT surprises a new engineer
- Each utility doc should be < 50 lines (brief, factual, with example)
- Update this file as gaps are filled (mark `[x]` when done)
