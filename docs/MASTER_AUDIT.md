# ClawAI Master Cross-Functional Audit & Strategy

**Date**: 2026-04-07
**Scope**: Full platform assessment — product, engineering, testing, security, DevOps, AI, observability, release readiness

---

## Executive Summary

ClawAI is a local-first AI orchestration platform built as a microservices architecture (11 NestJS services + Next.js frontend + 7 PostgreSQL + MongoDB + Redis + RabbitMQ + Ollama). The platform demonstrates strong foundational engineering with real end-to-end functionality in chat, routing, connectors, auth, audit, and observability. However, several critical integration gaps prevent the system from delivering on its full vision.

**What works well (REAL):**
- Chat with durable threads, messages, feedback, regeneration
- 7-mode routing engine with health-aware fallback chains
- Connector management with 5 cloud providers (encrypted secrets, model sync, health checks)
- Auth with JWT, refresh rotation, RBAC (3 roles), password management
- Audit logging with 10 event types, usage ledger, cost tracking
- Client/server structured logging (Elasticsearch-ready)
- Health aggregation across all services
- Frontend with 15+ pages, 9 languages, RTL support, mobile responsiveness
- Install automation (bash + PowerShell scripts)

**What is broken or missing (GAPS):**
1. Memory is CRUD-only — never injected into chat context
2. Files are uploaded/chunked but never grounded into AI responses (no RAG)
3. Context packs are CRUD-only — never attached to threads or injected
4. Ollama is never used as a router/judge — routing is pure heuristic
5. Streaming is a placeholder (hardcoded "not connected")
6. Routing policies exist but are never evaluated
7. No rate limiting anywhere
8. No security headers (Helmet)
9. No CI/CD pipeline
10. No E2E tests

**Overall Readiness: 65% — Strong foundation, critical integration gaps**

---

## 1. Current-State Assessment

### Feature Reality Matrix

| Feature | Backend | Frontend | Integration | Status |
|---------|---------|----------|-------------|--------|
| Chat threads/messages | REAL | REAL | REAL | Production-ready |
| Message routing (7 modes) | REAL | REAL | REAL | Working e2e |
| Manual model selection | REAL | REAL | REAL | Just shipped |
| Connector CRUD + health + sync | REAL | REAL | REAL | Production-ready |
| Auth (login, JWT, RBAC) | REAL | REAL | REAL | Production-ready |
| User management (admin) | REAL | REAL | REAL | Working |
| Settings (lang, theme, password) | REAL | REAL | REAL | Working |
| Audit logging (10 events) | REAL | REAL | REAL | Comprehensive |
| Usage ledger / observability | REAL | REAL | REAL | Working |
| Client logs (batched, redacted) | REAL | REAL | REAL | Working |
| Server logs (structured, RabbitMQ) | REAL | REAL | REAL | Elasticsearch-ready |
| Health aggregation | REAL | REAL | REAL | Working |
| Ollama model management | REAL | REAL | REAL | Pull, roles, health |
| File upload + chunking | REAL | REAL | NOT INTEGRATED | Files never influence AI |
| Memory CRUD | REAL | REAL | NOT INTEGRATED | Never injected into context |
| Context packs CRUD | REAL | REAL | NOT INTEGRATED | Never attached to threads |
| Ollama as router/judge | NOT IMPL | N/A | N/A | Pure heuristic routing |
| SSE streaming | STUB | N/A | N/A | Hardcoded placeholder |
| Routing policy evaluation | CRUD ONLY | REAL | NOT INTEGRATED | Policies never evaluated |
| File upload in chat | N/A | MISSING | N/A | No UI or API support |
| Anti-hallucination controls | NOT IMPL | N/A | N/A | No structured output |

---

## 2. Gap Analysis

### P0 — Critical (Blocks product promise)

| # | Gap | Impact | Services Affected |
|---|-----|--------|-------------------|
| G1 | Memory never injected into chat context | AI has no long-term memory | chat-service, memory-service |
| G2 | Files never grounded in AI responses | Uploaded files are useless for AI | chat-service, file-service |
| G3 | Context packs never injected | Context bundles are CRUD-only | chat-service, memory-service |
| G4 | Ollama not used as router | Routing is blind heuristic, not intelligent | routing-service, ollama-service |
| G5 | No streaming | Users wait for full response, bad UX | chat-service, frontend |

### P1 — High (Blocks production deployment)

| # | Gap | Impact |
|---|-----|--------|
| G6 | No rate limiting | Brute force, DDoS vulnerability |
| G7 | No security headers (Helmet) | XSS, clickjacking exposure |
| G8 | No CI/CD pipeline | Manual testing only |
| G9 | No E2E tests | Regressions undetected |
| G10 | Routing policies not evaluated | Policy CRUD is decorative |

### P2 — Medium (Quality/completeness)

| # | Gap | Impact |
|---|-----|--------|
| G11 | 2 services have 0 tests (logs) | Untestable changes |
| G12 | No file upload in chat UI | Users can't attach files in conversation |
| G13 | Docker health checks missing for app services | Orchestration blind spots |
| G14 | No database backup/replication config | Data loss risk |

---

## 3. Target-State Product Design

### Core User Flow (Target)

```
User types message
  → [optional] attaches file
  → [optional] selects model (or uses thread/auto default)
  → System assembles context:
      - Thread history (last 20 messages)
      - System prompt (from thread settings)
      - Retrieved memories (semantic + recent, with token budget)
      - Active context packs (attached to thread)
      - File chunks (from attached/mentioned files, relevance-ranked)
      - User preferences
  → Ollama router evaluates:
      - Structured JSON output: { provider, model, confidence, reason }
      - Validated against: health, capability, policy, privacy, cost
      - Falls back if primary unavailable
  → Selected model executes with assembled context
  → Response streamed to user (SSE)
  → Post-execution:
      - Store message + metadata (tokens, latency, provider, model)
      - Extract memories asynchronously
      - Publish audit event
      - Update thread lastProvider/lastModel
  → User sees:
      - Streamed response
      - Model attribution badge
      - Routing transparency (expandable)
      - Feedback buttons
```

---

## 4. Backend Design (Changes Required)

### 4.1 Context Assembly Service (NEW — in chat-service)

**File**: `apps/claw-chat-service/src/modules/chat-messages/managers/context-assembly.manager.ts`

Responsible for building the full context before execution:

```typescript
interface AssembledContext {
  systemPrompt: string | null;
  threadMessages: ChatMessage[];       // last N messages
  memories: MemoryRecord[];            // retrieved from memory-service
  contextPackItems: ContextPackItem[]; // from attached packs
  fileChunks: FileChunk[];             // from attached/mentioned files
  tokenBudget: number;
  truncated: boolean;
}
```

**Integration points:**
- HTTP call to memory-service: `GET /api/v1/internal/memories?userId=X&limit=10`
- HTTP call to memory-service: `GET /api/v1/internal/context-packs/:id/items`
- HTTP call to file-service: `GET /api/v1/internal/files/:id/chunks`
- Token budgeting: count tokens, truncate oldest context first

### 4.2 Memory Injection (G1 fix)

**memory-service changes:**
- Add internal endpoint: `GET /api/v1/internal/memories` (filtered by userId, enabled, sorted by relevance)
- Add auto-extraction in `handleMessageCompleted()` — call Ollama to extract facts/preferences from assistant responses

**chat-service changes:**
- Context assembly calls memory-service before execution
- Memories formatted as system-level context: `"User memories: [fact1], [fact2]..."`

### 4.3 File Grounding (G2 fix)

**file-service changes:**
- Add internal endpoint: `GET /api/v1/internal/files/:id/chunks` (returns file chunks)
- Add vector embeddings (pgvector) for semantic chunk retrieval

**chat-service changes:**
- Add `fileIds?: string[]` to CreateMessageDto
- Context assembly retrieves relevant chunks from attached files
- Chunks formatted as context: `"Attached file content: [chunk1], [chunk2]..."`

### 4.4 Context Pack Injection (G3 fix)

**chat-service schema change:**
- Add `contextPackIds String[]` to ChatThread model

**memory-service changes:**
- Add internal endpoint: `GET /api/v1/internal/context-packs/:id/items`

**chat-service changes:**
- Context assembly retrieves items from attached context packs
- Items injected as system context

### 4.5 Ollama as Router (G4 fix)

**routing-service changes:**
- New `OllamaRouterManager` that calls Ollama with a structured prompt
- Prompt template asks Ollama to return JSON: `{ provider, model, confidence, reason }`
- Zod schema validates Ollama's response
- Falls back to heuristic routing if Ollama fails or returns invalid JSON
- Requires a "router" role model assigned in Ollama service (e.g., gemma2:2b)

**Anti-hallucination controls:**
- Temperature: 0.0 (deterministic)
- Structured output schema validation
- Route validation layer (is the suggested provider healthy? does it exist?)
- Capability check (does the model support the requested modality?)
- Timeout: 5s max for routing decision
- Fallback: heuristic routing if Ollama router fails

### 4.6 Streaming (G5 fix)

**chat-service changes:**
- Chat execution manager sends `stream: true` to providers
- SSE controller pipes chunks from provider response to client
- Frontend receives chunks via EventSource and renders incrementally
- Message stored after stream completes with full content

---

## 5. Frontend Design (Changes Required)

| Change | File | Priority |
|--------|------|----------|
| File attachment button in message composer | `message-composer.tsx` | P0 |
| File picker dialog (select from uploaded files) | New component | P0 |
| Streaming message rendering (chunk by chunk) | `message-bubble.tsx` | P0 |
| Context pack selector in thread settings | `thread-settings.tsx` | P1 |
| Routing transparency panel (expand to see why) | `routing-transparency.tsx` (exists) | P1 |
| Memory injection indicator on messages | `message-bubble.tsx` | P2 |

---

## 6. AI Routing & Model-Selection Design

### Current (Heuristic)
```
message.created → routing-service → switch(mode) → hardcoded rules → message.routed
```

### Target (Ollama-Assisted)
```
message.created → routing-service → call Ollama router model
  → structured JSON response → validate → health check → message.routed
  → fallback to heuristic if Ollama fails
```

### Router Model Requirements
- Model: gemma2:2b or qwen2.5:3b (small, fast, good at structured output)
- Temperature: 0.0
- Max tokens: 256
- Response format: JSON with schema validation
- Latency budget: <5s (kill and fallback if exceeded)

---

## 7. Memory & Context Design

### Context Assembly Order (Token Budget: configurable, default 4096)
1. System prompt (from thread settings) — highest priority
2. User preferences (from memory, type=PREFERENCE) — high priority
3. Instructions (from memory, type=INSTRUCTION) — high priority
4. Context pack items (attached to thread) — medium priority
5. File chunks (from attached files) — medium priority
6. Facts (from memory, type=FACT) — medium priority
7. Thread history (last N messages, newest first) — fills remaining budget
8. Summaries (from memory, type=SUMMARY) — lowest priority, fills gaps

### Token Budgeting Strategy
- Count tokens per section using tiktoken or approximate (4 chars = 1 token)
- If over budget: truncate oldest thread messages first, then summaries, then facts
- Never truncate system prompt, user preferences, or instructions

### Auto-Extraction Pipeline
```
message.completed event
  → memory-service receives
  → calls Ollama with extraction prompt
  → extracts: facts, preferences, instructions
  → stores as MemoryRecord (type, content, sourceThreadId)
  → publishes memory.extracted event
```

---

## 8. File Support Design

### Current State
- Upload → validate → store on disk → chunk by type → store chunks in DB
- File types: JSON, CSV, Markdown, plain text
- Ingestion status tracking: PENDING → PROCESSING → COMPLETED → FAILED

### Missing Pipeline
```
File uploaded → chunked → [MISSING: embedded] → [MISSING: indexed]
Message sent with fileIds → [MISSING: retrieve relevant chunks] → [MISSING: inject into context]
```

### Required Additions
1. **Vector embeddings**: Use pgvector (already available in PostgreSQL image) to store chunk embeddings
2. **Embedding generation**: Call Ollama embedding model or use a lightweight local embedder
3. **Semantic retrieval**: Query pgvector for top-K relevant chunks given the user's message
4. **Token-budgeted injection**: Include most relevant chunks within token budget

---

## 9. Logging / Audit / Tracing Design

### Current State: SOLID
- Client logs: batched, redacted, MongoDB with TTL (30 days)
- Server logs: RabbitMQ event-driven, structured JSON, Elasticsearch-ready
- Audit logs: 10 event types, usage ledger, severity levels
- Trace correlation: requestId + traceId fields supported

### Gaps
- No request correlation ID from frontend → backend (frontend logger doesn't send traceId)
- No distributed tracing (OpenTelemetry)
- No log aggregation dashboard (Kibana/Grafana)

### Recommendations
1. Add `X-Request-ID` header from frontend HTTP client → propagate through all services
2. Consider OpenTelemetry SDK for distributed tracing (future phase)
3. Add docker-compose service for Elasticsearch + Kibana (optional profile)

---

## 10. Docker / DevOps / Runtime Design

### Hot Reload Matrix

| Change Type | Action Required | Downtime |
|-------------|----------------|----------|
| Source code (src/) | Auto-detected by `node --watch` | None |
| Prisma schema | Rebuild container (runs migrate in entrypoint) | ~30s |
| Package.json deps | Rebuild container | ~60s |
| Docker compose config | `docker compose up -d` (recreate) | ~10s |
| .env values | Restart containers | ~5s |
| Shared packages | Rebuild shared package + restart dependent services | ~30s |

### Missing DevOps
1. **CI/CD**: GitHub Actions for lint → typecheck → test → build → push
2. **Health checks for app containers**: Add wget-based healthcheck in docker-compose
3. **Log rotation**: Docker log driver config (json-file with max-size/max-file)
4. **Backup**: pg_dump cron job for PostgreSQL, mongodump for MongoDB

---

## 11. Security / Reliability / Performance

### Security Checklist

| Control | Status | Action |
|---------|--------|--------|
| Authentication (JWT) | DONE | — |
| Authorization (RBAC) | DONE | — |
| Input validation (Zod) | DONE | — |
| SQL injection (Prisma ORM) | SAFE | — |
| XSS (React, no dangerouslySetInnerHTML) | SAFE | — |
| Secret encryption (AES-256-GCM) | DONE | — |
| Secret redaction in logs | DONE | — |
| CORS | DONE | — |
| Rate limiting | MISSING | Add @nestjs/throttler |
| Security headers (Helmet) | MISSING | Add helmet middleware |
| HTTPS | NOT CONFIGURED | Add TLS termination at Nginx |
| CSP | MISSING | Add via Helmet |
| Refresh token revocation | PARTIAL | Add blacklist on logout |

### Performance Considerations
- 7 separate PostgreSQL instances — high memory usage (~200MB each)
- Consider consolidating to 1-2 PostgreSQL instances with separate databases (schema isolation)
- RabbitMQ durable queues — good for reliability, slight latency overhead
- Ollama router decision adds ~1-3s latency — must have timeout + fallback

---

## 12. Implementation Plan by Phase

### Phase 1: Security Hardening (1 week)
1. Add `@nestjs/throttler` to all services (rate limiting)
2. Add `helmet` middleware to all services
3. Add service health checks to all docker-compose files
4. Fix routing page default settings (wire to backend)
5. Add tests for client-logs and server-logs services

### Phase 2: Context Assembly + Memory Integration (2 weeks)
1. Build context assembly manager in chat-service
2. Add internal memory retrieval endpoint
3. Wire memory injection into chat execution
4. Add auto-extraction after message completion
5. Add context pack attachment to threads (schema + UI)
6. Wire context pack injection into execution

### Phase 3: File Grounding (2 weeks)
1. Add pgvector embeddings to file chunks
2. Add embedding generation (Ollama embedding model)
3. Add semantic retrieval endpoint in file-service
4. Wire file grounding into context assembly
5. Add file attachment UI in message composer
6. Add file picker dialog

### Phase 4: Ollama Router (1 week)
1. Build OllamaRouterManager with structured output
2. Add Zod validation for router response
3. Add route validation layer (health, capability, policy)
4. Add anti-hallucination controls (temperature 0, timeout, fallback)
5. Wire into routing service as primary router (heuristic as fallback)

### Phase 5: Streaming (1 week)
1. Update execution manager to use `stream: true`
2. Implement SSE pipe from provider to client
3. Update frontend to render chunks incrementally
4. Store complete message after stream finishes

### Phase 6: CI/CD + Testing (1 week)
1. GitHub Actions: lint → typecheck → test → build
2. E2E tests for critical flows (Playwright)
3. API contract tests for key endpoints
4. Add integration tests for event flows

---

## 13. Database / Data Model Changes

| Service | Change | Migration |
|---------|--------|-----------|
| chat-service | Add `contextPackIds String[]` to ChatThread | Yes |
| chat-service | Add `fileIds` relationship to ChatMessage | Yes |
| file-service | Add `embedding Vector(384)` to FileChunk | Yes (pgvector) |
| memory-service | Add `embedding Vector(384)` to MemoryRecord | Yes (pgvector) |

---

## 14. API Contracts / Events / Jobs

### New Internal Endpoints

| Endpoint | Service | Purpose |
|----------|---------|---------|
| `GET /api/v1/internal/memories` | memory-service | Retrieve user memories for context |
| `GET /api/v1/internal/context-packs/:id/items` | memory-service | Retrieve pack items |
| `GET /api/v1/internal/files/:id/chunks` | file-service | Retrieve file chunks |
| `POST /api/v1/internal/ollama/route` | ollama-service | Structured routing decision |

### New Events

| Event | Publisher | Subscriber | Purpose |
|-------|----------|------------|---------|
| `memory.auto_extracted` | memory-service | audit-service | Track extraction |
| `context.assembled` | chat-service | server-logs | Debug context assembly |

---

## 15. Test Plan

### Unit Tests (per service)
- All services: >80% coverage on services, managers, DTOs
- Priority: Add tests for client-logs-service, server-logs-service

### Integration Tests
- Message flow: create → route → execute → complete
- Memory flow: message complete → extract → store
- File flow: upload → chunk → retrieve in context

### E2E Tests (Playwright)
- Login → create thread → send message → receive response
- Upload file → send message referencing file → verify grounded response
- Change model → send message → verify correct provider used
- Admin: create user → change role → verify access

### API Contract Tests
- All public endpoints: verify request/response shapes
- All internal endpoints: verify inter-service contracts

---

## 16. Productification & Business Recommendations

1. **Onboarding wizard**: First-run experience that pulls a default Ollama model and creates a sample thread
2. **Usage dashboards**: Already have observability page — add cost alerts, usage quotas
3. **Export**: Allow exporting threads, audit logs, memory as JSON/CSV
4. **Backup/restore**: One-click backup of all databases
5. **Multi-tenant**: Current architecture supports it (userId scoping) — formalize tenant isolation
6. **Billing integration**: Usage ledger already tracks tokens — add pricing tiers

---

## 17. Release Gates

| Gate | Criteria | Status |
|------|----------|--------|
| All services healthy | `docker compose ps` shows all healthy | PASS |
| All tests pass | `npm run test` exits 0 | PASS (after routing test fix) |
| Typecheck passes | `npm run typecheck` exits 0 | PASS |
| Lint passes | `npm run lint` exits 0 (warnings OK) | PASS |
| Rate limiting enabled | All public endpoints throttled | NOT DONE |
| Security headers | Helmet middleware active | NOT DONE |
| E2E tests pass | Critical flows verified | NOT DONE |
| CI/CD green | GitHub Actions pipeline passes | NOT DONE |
| Memory integration | Memories injected into chat context | NOT DONE |
| File grounding | Files influence AI responses | NOT DONE |
| Streaming | Real SSE streaming from providers | NOT DONE |

---

## 18. Risks, Blockers, and Fallbacks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Ollama router produces invalid JSON | High | Medium | Zod validation + heuristic fallback |
| Ollama router too slow (>5s) | Medium | High | 5s timeout, fallback to heuristic |
| Memory injection bloats context | Medium | Medium | Token budgeting with truncation |
| File embedding quality poor | Medium | Medium | Use established embedding model (nomic-embed-text) |
| 7 PostgreSQL instances exhaust RAM | Low | High | Consolidate to 1-2 instances with schema isolation |
| No CI/CD causes regressions | High | High | Implement GitHub Actions ASAP |

---

## 19. Final Verification Checklist

| Dimension | Covered? | Notes |
|-----------|----------|-------|
| Plan | YES | 6-phase implementation plan with priorities |
| Design | YES | Backend, frontend, AI, memory, files, logging |
| Implementation | PARTIAL | Foundation done, integration gaps identified |
| Wiring | PARTIAL | Chat+routing+connectors wired; memory/files/context not wired |
| Testing | PARTIAL | Unit tests good (65%), no E2E, no integration |
| Double-checking | YES | Audit identifies all gaps explicitly |
| Productification | YES | Recommendations provided |
| Businessification | YES | KPIs, metrics, billing path identified |
| DevOps readiness | PARTIAL | Docker solid, no CI/CD, no health checks for apps |
| Observability | GOOD | Structured logs, audit, usage ledger, health aggregation |
| Auditability | GOOD | 10 event types, usage ledger, severity levels |
| Security | PARTIAL | Auth/RBAC solid, missing rate limiting + headers |
| Reliability | GOOD | Fallback chains, health-aware routing, durable queues |
| Performance | ADEQUATE | No load testing, 7 PG instances is heavy |
| Release readiness | 65% | Strong foundation, blocked by P0/P1 gaps |

---

## 20. "Likely Fake/Decorative" Detection List

| Feature | How to Detect | Current Status |
|---------|---------------|----------------|
| SSE Streaming | Check `chat-stream.controller.ts` — returns hardcoded string | DECORATIVE |
| Routing policies | Create a policy, send a message — policy is ignored | DECORATIVE |
| Memory in chat | Create a memory, send a message — memory not in prompt | NOT INTEGRATED |
| File grounding | Upload file, ask about it — AI has no file context | NOT INTEGRATED |
| Context packs in chat | Create pack, chat — pack content not in prompt | NOT INTEGRATED |
| Ollama router | Send message, check routing logs — no Ollama call | NOT IMPLEMENTED |
| Routing page defaults | Change default mode/fallback — not saved | DECORATIVE |

---

## 21. Recommended KPIs

| Category | Metric | Target |
|----------|--------|--------|
| **Reliability** | Service uptime | >99.5% |
| **Reliability** | Routing fallback rate | <10% |
| **Performance** | P95 response latency | <5s (non-streaming) |
| **Performance** | Routing decision latency | <2s |
| **Quality** | Positive feedback rate | >70% |
| **Usage** | Daily active threads | Growing week-over-week |
| **Cost** | Avg cost per message | Tracked in usage ledger |
| **Trust** | Memory accuracy (user-reported) | >80% |
| **Observability** | Log coverage (events with traceId) | >95% |
| **Security** | Failed auth attempts / hour | <100 (rate limited) |
