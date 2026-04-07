# ClawAI Forward Development Plan

**Date**: 2026-04-07
**Baseline**: Full-lifecycle audit score 7.0/10
**Goal**: Raise to 9.0/10 — production-ready for staged public rollout

---

## 1. Executive Positioning

ClawAI is a **self-hosted AI orchestration platform** that routes prompts to the best model (local Ollama or 5 cloud providers), assembles context from memory + files + conversation history, and provides full routing transparency. It serves technical teams who need privacy-aware, multi-model AI with persistent context.

**Current state**: Strong foundation (8/10 backend, 8/10 frontend), weak in operational hardening (6/10 testing, 6/10 reliability).

**To reach 9/10**: Need streaming, E2E tests, circuit breakers, memory/file trust indicators, and onboarding.

---

## 2. Gap-to-Action Conversion

Every gap from the audit, converted to implementable work with priority, effort, and acceptance criteria.

### TIER 0 — Critical (Blocks Beta)

| # | Gap | Root Cause | Fix | Effort | Acceptance Criteria |
|---|-----|-----------|-----|--------|-------------------|
| 1 | No E2E tests | Playwright installed but empty | Write 5 critical flow tests: login→chat→response, upload→attach→grounded answer, model selector→verify provider, memory→verify influence, admin→role change | 3 days | All 5 pass in CI |
| 2 | No memory influence indicator | Frontend doesn't show which memories were used | Add "Informed by N memories" badge on assistant messages. Backend: include memory count in message.completed event. Frontend: display in MessageBubble | 1 day | Badge visible when memories injected |
| 3 | No file attribution indicator | Files influence answers invisibly | Add "Grounded in: filename.pdf" tag on messages. Backend: include fileIds in context metadata. Frontend: display file badges | 1 day | File names visible when files used |
| 4 | No onboarding wizard | New users see blank dashboard | Create first-run experience: detect empty state, show step-by-step guide (pull model, create thread, send message) | 2 days | First-time user completes guided flow |

### TIER 1 — High (Blocks Production)

| # | Gap | Fix | Effort | Acceptance |
|---|-----|-----|--------|------------|
| 5 | No TLS/HTTPS | Add self-signed cert for dev, Let's Encrypt for prod. Update Nginx config with SSL block. Add NGINX_SSL_CERT/KEY env vars | 1 day | HTTPS works on port 443 |
| 6 | No circuit breaker | Add opossum circuit breaker wrapping all inter-service HTTP calls in chat-service, routing-service, memory-service | 2 days | Circuit opens after 5 failures, closes after 30s |
| 7 | No real streaming | Replace polling with SSE token streaming. Update ChatExecutionManager to use stream:true. Pipe chunks through SSE controller. Frontend: EventSource with incremental render | 3 days | User sees tokens appear one by one |
| 8 | No vector embeddings for files | Add pgvector embedding column to FileChunk. Generate embeddings via Ollama embedding model. Add semantic search endpoint. Wire into ContextAssemblyManager | 3 days | Only relevant chunks injected (not all) |
| 9 | Health cache staleness | Add TTL to health cache entries (5 min). Add periodic refresh via setInterval. Add health re-validation before publishing message.routed | 1 day | Stale entries auto-expire |
| 10 | No integration tests in CI | Add docker-compose-based integration test job. Spin up PG+Mongo+RabbitMQ. Run cross-service flow tests | 2 days | CI runs integration tests on PR |

### TIER 2 — Medium (Improves Quality)

| # | Gap | Fix | Effort |
|---|-----|-----|--------|
| 11 | Memory contradiction detection | Before storing extracted memory, check for conflicting existing memories of same type. Flag or replace | 2 days |
| 12 | Memory expiration | Add `expiresAt` field to MemoryRecord. Cron job or TTL to disable old memories | 1 day |
| 13 | Export functionality | Add export endpoints: thread as JSON/Markdown, memories as JSON, audit logs as CSV | 2 days |
| 14 | Keyboard shortcuts | Add cmd+k search, cmd+n new thread, cmd+enter send | 1 day |
| 15 | Tests for 0-test services | Add unit tests for client-logs-service and server-logs-service | 2 days |
| 16 | Model existence validation | After routing decision, verify model exists in connector's model catalog before execution | 1 day |

### TIER 3 — Future (Enterprise/Scale)

| # | Gap | Fix | Effort |
|---|-----|-----|--------|
| 17 | Multi-tenant/org support | Add Organization model, scope all data by orgId | 5 days |
| 18 | Billing/usage quotas | Add quota enforcement based on usage ledger | 3 days |
| 19 | OpenTelemetry distributed tracing | Add OTel SDK, propagate spans across services | 3 days |
| 20 | Background job queue (BullMQ) | Move file processing + memory extraction to async jobs | 3 days |
| 21 | Load testing | k6 or Artillery scripts for critical endpoints | 2 days |
| 22 | Database consolidation | Merge 7 PG instances into 1-2 with schema isolation | 3 days |

---

## 3. Current-State vs Target-State Matrix

| Module | Current (7.0) | Target (9.0) | Gap | Priority |
|--------|---------------|-------------|-----|----------|
| Chat | 9/10 | 10/10 | Streaming, keyboard shortcuts | T1 |
| Routing | 8/10 | 9/10 | Health TTL, model validation, post-decision check | T1 |
| Memory | 7/10 | 9/10 | Influence indicators, contradiction, expiration | T0+T2 |
| Files | 6/10 | 9/10 | Embeddings, semantic search, attribution | T0+T1 |
| Context Assembly | 8/10 | 9/10 | Already solid, needs semantic file retrieval | T1 |
| Connectors | 9/10 | 9/10 | Done | — |
| Auth/RBAC | 9/10 | 9/10 | Done (add TLS) | T1 |
| Audit/Usage | 8/10 | 9/10 | Add export | T2 |
| Observability | 8/10 | 9/10 | Add distributed tracing | T3 |
| Docker/Install | 9/10 | 10/10 | Done | — |
| Frontend | 8/10 | 9/10 | Streaming, indicators, onboarding | T0+T1 |
| Testing | 6/10 | 9/10 | E2E, integration, load | T0+T1 |
| Security | 7/10 | 9/10 | TLS, circuit breaker | T1 |
| Reliability | 6/10 | 9/10 | DLQ (done), circuit breaker, health TTL | T1 |

---

## 4. Implementation Timeline

### Week 1 (Tier 0 — Beta Blockers)
- Day 1-2: E2E tests (5 critical flows)
- Day 2: Memory influence indicator + file attribution indicator
- Day 3-4: Onboarding wizard
- Day 4: Update all docs, .env, install scripts

### Week 2 (Tier 1 — Production Blockers)
- Day 1: TLS/HTTPS in Nginx
- Day 1-2: Circuit breaker for inter-service calls
- Day 2-3: Health cache TTL + refresh
- Day 3-5: Real token-by-token SSE streaming

### Week 3 (Tier 1 continued)
- Day 1-3: Vector embeddings + semantic file search
- Day 3-4: Integration tests in CI
- Day 5: Model existence validation post-routing

### Week 4 (Tier 2 — Quality)
- Day 1-2: Memory contradiction detection + expiration
- Day 2-3: Export functionality
- Day 3: Keyboard shortcuts
- Day 4-5: Tests for 0-test services

**Total estimated: 4 weeks for a solo developer, 2 weeks for a 2-person team.**

---

## 5. Testing Master Plan

### Unit Tests (Current: 312)
- Add: client-logs-service (~20 tests), server-logs-service (~20 tests)
- Add: ContextAssemblyManager tests, MemoryExtractionManager tests
- Target: 400+ tests

### E2E Tests (Current: 0)
1. Login → create thread → send message → verify response arrives
2. Upload file → attach to message → verify grounded response
3. Select specific model → send message → verify provider badge
4. Create memory → send message → verify memory influence indicator
5. Change routing policy → send message → verify policy applied

### Integration Tests (Current: 0)
1. message.created → routing → message.routed → execution → message.completed
2. File upload → chunk → retrieve via internal endpoint
3. Memory extraction → store → retrieve in next context assembly
4. Connector health check → health cache update → routing decision

### Load Tests (Current: 0)
- 100 concurrent users sending messages
- 50 file uploads simultaneously
- Routing under all-providers-healthy vs degraded scenarios

---

## 6. Release Criteria

### Beta Release (Score target: 8.0/10)
- [ ] 5 E2E tests passing in CI
- [ ] Memory influence indicator visible
- [ ] File attribution indicator visible
- [ ] Onboarding wizard functional
- [ ] All 12 services healthy
- [ ] 0 lint errors, 0 typecheck errors
- [ ] 350+ unit tests passing

### Production Release (Score target: 9.0/10)
- [ ] TLS/HTTPS enabled
- [ ] Circuit breakers on all inter-service calls
- [ ] Real SSE streaming
- [ ] Vector embeddings for files
- [ ] Integration tests in CI
- [ ] Health cache with TTL
- [ ] Model existence validation
- [ ] 400+ unit tests + 5 E2E + integration suite
- [ ] Load test baseline established

---

## 7. What ClawAI Gets Right

1. **Architecture**: Clean microservice boundaries, event-driven, service-level data ownership
2. **Routing**: 7 modes + Ollama-assisted AUTO + policy overrides — genuinely differentiated
3. **Context Assembly**: Real pipeline with 4 sources, token budgeting, priority ordering
4. **Transparency**: Users can see provider, model, confidence, reasons for every message
5. **Security**: 9 layers (JWT, RBAC, rate limiting, Helmet, Zod, Prisma, encryption, redaction, CORS)
6. **DevX**: Automated install, 563-line CLAUDE.md, Docker orchestration, hot reload
7. **i18n**: 8 languages with RTL — unusual for an AI platform
8. **Documentation**: 14 architecture docs, 200+ KB — exceptional for this stage

## 8. What Must Be Fixed Immediately

1. **Memory influence invisible** — users don't know memories affect answers (trust gap)
2. **File attribution invisible** — users don't know files affect answers (trust gap)
3. **No E2E tests** — can't prove critical flows work (confidence gap)
4. **No onboarding** — new users face blank dashboard (adoption gap)

## 9. What to Build Next

1. **Real streaming** — transform UX from "wait and see" to "watch it think"
2. **Semantic file search** — make file grounding intelligent, not brute-force
3. **Circuit breakers** — prevent cascading failures
4. **TLS** — minimum for any non-local deployment

## 10. What to Defer

- Multi-tenant/org support (enterprise feature, not needed for initial users)
- Billing/quotas (premature — focus on adoption first)
- OpenTelemetry (X-Request-ID is sufficient for now)
- Database consolidation (7 PG instances work fine at current scale)

## 11. Final Strategic Recommendation

**ClawAI is a serious product, not an experiment.** The architecture is sound, the feature set is comprehensive, and the routing intelligence is genuinely differentiated. The path from 7.0 to 9.0 is clear and achievable in 4 weeks.

The single most important thing to do next is **make the invisible visible** — show users which memories and files influenced each answer. This is the difference between "technically works" and "users trust it."

**Trajectory: Strong. Recommendation: Execute Tier 0 this week, ship beta.**
