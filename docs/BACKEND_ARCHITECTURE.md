# ClawAI Backend Architecture & Wiring Audit

**Date**: 2026-04-07
**Scope**: Backend services, data flow, queues, persistence, eventing, APIs, adapters, health, runtime

---

## 1. Current-State Assessment

### Service Map (11 services)

| Service | Port | Database | Status | Key Finding |
|---------|------|----------|--------|-------------|
| auth-service | 4001 | PostgreSQL claw_auth | REAL | JWT + refresh rotation, RBAC (3 roles), user CRUD, password management. Missing: device session tracking |
| chat-service | 4002 | PostgreSQL claw_chat | REAL | Thread/message CRUD, context assembly, execution with fallback chain. Missing: token streaming, contextPackIds on thread |
| connector-service | 4003 | PostgreSQL claw_connectors | REAL | 5 provider adapters (OpenAI, Anthropic, Gemini, Bedrock, DeepSeek), health check, model sync, encrypted config |
| routing-service | 4004 | PostgreSQL claw_routing | REAL | 7 routing modes, Ollama-assisted AUTO routing, heuristic fallback, decision persistence. Missing: capability matching |
| memory-service | 4005 | PostgreSQL claw_memory (pgvector) | PARTIAL | CRUD works. Auto-extraction is a STUB (just logs). Internal endpoints for context retrieval work |
| file-service | 4006 | PostgreSQL claw_files | PARTIAL | Upload, validation, chunking (JSON/CSV/MD/text) work. NO vector embeddings, NO semantic search |
| audit-service | 4007 | MongoDB claw_audit | REAL | 10 event types handled, usage ledger with token/cost tracking, severity levels |
| ollama-service | 4008 | PostgreSQL claw_ollama | REAL | Model pull, list, generate, health check, role assignment (ROUTER/FALLBACK/REASONING/CODING). Roles are NOT consumed by routing |
| health-service | 4009 | None | REAL | Pings all services, aggregates status (healthy/degraded/unhealthy), used by Docker + frontend |
| client-logs-service | 4010 | MongoDB claw_client_logs | REAL | Batched ingestion from frontend, TTL 30 days, structured JSON, searchable |
| server-logs-service | 4011 | MongoDB claw_server_logs | REAL | RabbitMQ-driven ingestion from all backend services, Elasticsearch-ready schema |

### Data Flow (Current)

```
Frontend → Nginx (4000) → Service endpoints
                        → Auth guard (JWT validation on every request)

Message flow:
  POST /chat-messages → chat-service creates USER message
    → publishes message.created (RabbitMQ)
    → routing-service receives message.created
    → calls Ollama router (AUTO mode) or uses heuristic
    → publishes message.routed
    → chat-service receives message.routed
    → ContextAssemblyManager.assemble():
        - fetches memories from memory-service (HTTP)
        - fetches file chunks from file-service (HTTP)
        - builds prompt with token budgeting
    → ChatExecutionManager.execute():
        - calls Ollama or cloud provider
        - tries fallback chain on failure
    → stores ASSISTANT message
    → emits SSE completion event
    → publishes message.completed (RabbitMQ)
    → audit-service records usage + audit log
    → memory-service receives (but extraction is a STUB)
```

---

## 2. Gap Analysis

### P0 — Critical Backend Gaps

| # | Gap | Impact | Remediation |
|---|-----|--------|-------------|
| B1 | Memory extraction is a STUB | AI never learns from conversations | Implement extraction in handleMessageCompleted using Ollama |
| B2 | No background job processing | File processing and memory extraction block request threads | Add BullMQ for async jobs |
| B3 | RabbitMQ nack discards messages | Message loss on any handler failure | Add dead-letter exchange + retry queue |
| B4 | No contextPackIds on ChatThread | Context packs can't be attached to threads | Add schema field + migration |
| B5 | Ollama role assignments not consumed by routing | Role system is decorative | Wire routing to query assigned router model |

### P1 — High Priority Gaps

| # | Gap | Impact | Remediation |
|---|-----|--------|-------------|
| B6 | No vector embeddings for files | Can't do semantic file retrieval, only full-chunk injection | Add pgvector embedding column + embedding generation |
| B7 | No capability-based routing | Can't filter models by supportsVision/supportsTools | Add capability check before route selection |
| B8 | No token-by-token streaming | Users wait for full response | Implement chunked streaming from providers |
| B9 | No device session tracking | Can't manage active sessions per device | Add device fingerprint to Session model |
| B10 | No circuit breaker for provider calls | One failing provider can cascade failures | Add circuit breaker pattern |

### P2 — Completeness Gaps

| # | Gap | Impact |
|---|-----|--------|
| B11 | No request correlation from frontend to backend | Can't trace a user action across services |
| B12 | No feature flags / system settings consumed at runtime | Can't toggle features without redeployment |
| B13 | No database backup automation | Data loss risk |

---

## 3. Data Model Assessment

### Existing Models (Verified)

**auth-service (PostgreSQL claw_auth)**
- `User` — id, email, username, passwordHash, role (ADMIN/OPERATOR/USER), status (ACTIVE/INACTIVE/SUSPENDED), mustChangePassword, languagePreference, appearancePreference
- `Session` — id, userId, refreshToken, expiresAt, createdAt
- `SystemSetting` — id, key (unique), value, description

**chat-service (PostgreSQL claw_chat)**
- `ChatThread` — id, userId, title, routingMode, lastProvider, lastModel, preferredProvider, preferredModel, isPinned, isArchived, systemPrompt, temperature, maxTokens
- `ChatMessage` — id, threadId, role (USER/ASSISTANT/SYSTEM/TOOL), content, provider, model, routingMode, routerModel, usedFallback, inputTokens, outputTokens, estimatedCost, latencyMs, feedback, metadata (JSON)
- `MessageAttachment` — id, messageId, fileId, type

**connector-service (PostgreSQL claw_connectors)**
- `Connector` — id, name, provider (OPENAI/ANTHROPIC/GEMINI/AWS_BEDROCK/DEEPSEEK/OLLAMA), status, authType, encryptedConfig, baseUrl, region, isEnabled, defaultModelId
- `ConnectorModel` — id, connectorId, provider, modelKey, displayName, lifecycle, supportsStreaming, supportsTools, supportsVision, supportsAudio, supportsStructuredOutput, maxContextTokens
- `ConnectorHealthEvent` — id, connectorId, status, latencyMs, errorMessage, checkedAt
- `ModelSyncRun` — id, connectorId, status, modelsFound, modelsAdded, modelsRemoved, startedAt, completedAt, errorMessage

**routing-service (PostgreSQL claw_routing)**
- `RoutingDecision` — id, messageId, threadId, selectedProvider, selectedModel, routingMode, confidence, reasonTags, privacyClass, costClass, fallbackProvider, fallbackModel
- `RoutingPolicy` — id, name, routingMode, priority, config (JSON), isActive

**memory-service (PostgreSQL claw_memory, pgvector enabled)**
- `MemoryRecord` — id, userId, type (SUMMARY/FACT/PREFERENCE/INSTRUCTION), content, sourceThreadId, sourceMessageId, isEnabled
- `ContextPack` — id, userId, name, description, scope
- `ContextPackItem` — id, contextPackId, type, content, fileId, sortOrder

**file-service (PostgreSQL claw_files)**
- `File` — id, userId, filename, mimeType, sizeBytes, storagePath, ingestionStatus (PENDING/PROCESSING/COMPLETED/FAILED)
- `FileChunk` — id, fileId, chunkIndex, content

**ollama-service (PostgreSQL claw_ollama)**
- `LocalModel` — id, name, family, parameterSize, quantization, sizeBytes, format, digest
- `PullJob` — id, modelName, status, progress, error, startedAt, completedAt
- `LocalModelRoleAssignment` — id, modelId, role (ROUTER/FALLBACK_CHAT/REASONING/CODING), assignedAt

**audit-service (MongoDB claw_audit)**
- `AuditLog` — userId, action, entityType, entityId, severity (LOW/MEDIUM/HIGH/CRITICAL), details, ipAddress, createdAt
- `UsageLedger` — userId, resourceType, action, quantity, unit, metadata, createdAt

**client-logs-service (MongoDB claw_client_logs)**
- `ClientLog` — level, message, component, action, userId, route, userAgent, metadata, createdAt (TTL 30 days)

**server-logs-service (MongoDB claw_server_logs)**
- `ServerLog` — level, message, serviceName, module, controller, action, requestId, traceId, userId, threadId, messageId, provider, latencyMs, errorCode, errorStack, metadata

### Missing Data Model Fields

| Model | Missing Field | Purpose |
|-------|---------------|---------|
| Session | deviceId, deviceName, ipAddress | Device session tracking |
| ChatThread | contextPackIds String[] | Attach context packs to threads |
| FileChunk | embedding Vector(384) | Semantic search via pgvector |
| MemoryRecord | embedding Vector(384) | Semantic memory retrieval |

---

## 4. API Contracts (Current)

### Auth Service (4001)
```
POST   /api/v1/auth/login          — { email, password } → { tokens, user }
POST   /api/v1/auth/refresh         — { refreshToken } → { tokens }
POST   /api/v1/auth/logout          — (authenticated) → 204
GET    /api/v1/auth/me              — (authenticated) → user profile
POST   /api/v1/users               — (admin) create user
GET    /api/v1/users               — (admin) list users
GET    /api/v1/users/:id           — (admin) get user
PATCH  /api/v1/users/:id           — (admin) update user
PATCH  /api/v1/users/me/password   — change own password
PATCH  /api/v1/users/me/preferences — update language/appearance
```

### Chat Service (4002)
```
POST   /api/v1/chat-threads         — create thread (title, routingMode, systemPrompt, temperature, maxTokens, preferredProvider, preferredModel)
GET    /api/v1/chat-threads         — list threads (paginated, filterable)
GET    /api/v1/chat-threads/:id     — get thread
PATCH  /api/v1/chat-threads/:id     — update thread
DELETE /api/v1/chat-threads/:id     — delete thread (cascades messages)
POST   /api/v1/chat-messages        — send message (threadId, content, routingMode?, provider?, model?, fileIds?)
GET    /api/v1/chat-messages/thread/:threadId — list messages
GET    /api/v1/chat-messages/:id    — get message
POST   /api/v1/chat-messages/:id/regenerate — regenerate response
PATCH  /api/v1/chat-messages/:id/feedback — set feedback
SSE    /api/v1/chat-messages/stream/:threadId — stream completion events
```

### Connector Service (4003)
```
POST   /api/v1/connectors           — create connector
GET    /api/v1/connectors           — list connectors
GET    /api/v1/connectors/:id       — get connector
PATCH  /api/v1/connectors/:id       — update connector
DELETE /api/v1/connectors/:id       — delete connector
POST   /api/v1/connectors/:id/test  — test health
POST   /api/v1/connectors/:id/sync  — sync models
GET    /api/v1/connectors/:id/models — list models
GET    /api/v1/internal/connectors/config?provider=X — (internal) get decrypted config
```

### Routing Service (4004)
```
POST   /api/v1/routing/evaluate      — evaluate route (routingMode, message, forcedModel?, forcedProvider?)
POST   /api/v1/routing/policies      — create policy
GET    /api/v1/routing/policies      — list policies
PATCH  /api/v1/routing/policies/:id  — update policy
DELETE /api/v1/routing/policies/:id  — delete policy
GET    /api/v1/routing/decisions/:threadId — get routing history for thread
```

### Memory Service (4005)
```
POST   /api/v1/memories              — create memory
GET    /api/v1/memories              — list memories (paginated, filterable by type)
GET    /api/v1/memories/:id          — get memory
PATCH  /api/v1/memories/:id          — update memory
DELETE /api/v1/memories/:id          — delete memory
PATCH  /api/v1/memories/:id/toggle   — toggle enabled/disabled
POST   /api/v1/context-packs         — create context pack
GET    /api/v1/context-packs         — list packs
GET    /api/v1/context-packs/:id     — get pack with items
PATCH  /api/v1/context-packs/:id     — update pack
DELETE /api/v1/context-packs/:id     — delete pack
POST   /api/v1/context-packs/:id/items — add item
DELETE /api/v1/context-packs/:id/items/:itemId — remove item
GET    /api/v1/internal/memories/for-context?userId=X&limit=N — (internal) get enabled memories
GET    /api/v1/internal/context-packs/:id/items — (internal) get pack items
```

### File Service (4006)
```
POST   /api/v1/files                 — upload file (base64 content)
GET    /api/v1/files                 — list files
GET    /api/v1/files/:id             — get file metadata
DELETE /api/v1/files/:id             — delete file + chunks
GET    /api/v1/files/:id/chunks      — get file chunks
GET    /api/v1/internal/files/:id/chunks — (internal) get chunks for context assembly
```

### Ollama Service (4008)
```
GET    /api/v1/ollama/models         — list installed models
POST   /api/v1/ollama/pull           — pull model from registry
POST   /api/v1/ollama/assign-role    — assign model to role
POST   /api/v1/ollama/generate       — (public) generate text
GET    /api/v1/ollama/health         — (public) health check
GET    /api/v1/ollama/runtimes       — list runtimes
```

### Health Service (4009)
```
GET    /api/v1/health                — (public) aggregated health status
```

### Audit Service (4007)
```
GET    /api/v1/audits                — (admin) list audit logs
GET    /api/v1/audits/stats          — (admin) audit statistics
GET    /api/v1/usage                 — (admin) usage entries
GET    /api/v1/usage/summary         — (admin) usage summary
GET    /api/v1/usage/cost            — (admin) cost summary
GET    /api/v1/usage/latency         — (admin) latency summary
```

---

## 5. Event Bus (RabbitMQ)

### Exchange
- Name: `claw.events` (topic exchange, durable)

### Published Events

| Event Pattern | Publisher | Subscribers | Payload |
|---------------|-----------|-------------|---------|
| `message.created` | chat-service | routing-service | messageId, threadId, userId, content, routingMode, forcedProvider?, forcedModel? |
| `message.routed` | routing-service | chat-service | messageId, threadId, selectedProvider, selectedModel, routingMode, fallbackProvider?, fallbackModel? |
| `message.completed` | chat-service | audit-service, memory-service | messageId, threadId, assistantMessageId, provider, model, inputTokens, outputTokens, latencyMs |
| `thread.created` | chat-service | — | threadId, userId |
| `user.login` | auth-service | audit-service | userId, email |
| `user.logout` | auth-service | audit-service | userId |
| `connector.created` | connector-service | audit-service | connectorId, provider, name, userId |
| `connector.updated` | connector-service | audit-service | connectorId, changes |
| `connector.deleted` | connector-service | audit-service | connectorId, userId |
| `connector.synced` | connector-service | audit-service, routing-service | connectorId, modelsFound, modelsAdded |
| `connector.health_checked` | connector-service | audit-service, routing-service | connectorId, status, latencyMs |
| `routing.decision_made` | routing-service | audit-service | threadId, selectedProvider, selectedModel, confidence, reasonTags |
| `memory.extracted` | memory-service | audit-service | memoryId, userId, type |
| `file.uploaded` | file-service | — | fileId, userId, filename |
| `file.chunked` | file-service | — | fileId, chunkCount |
| `log.server` | all backend services | server-logs-service | structured log payload |

### Missing Resilience
- No dead-letter exchange (DLX)
- No retry queue
- Failed messages are nack'd without requeue (discarded)
- No message TTL

---

## 6. Unwired Backend Smell List

These are things that LOOK complete but are NOT:

| Smell | Where | What's Wrong |
|-------|-------|--------------|
| Memory extraction handler | memory-service handleMessageCompleted | Just logs "Received message.completed" — no extraction logic |
| Ollama role assignments | ollama-service LocalModelRoleAssignment | Schema exists, CRUD exists, but routing-service never queries roles |
| Routing policies | routing-service RoutingPolicy | Full CRUD, but evaluateRoute() never reads policies |
| MessageAttachment model | chat-service schema | Model defined, but never populated — messages don't track file associations |
| Context pack thread attachment | chat-service | No contextPackIds field on ChatThread — packs can't be linked |
| SSE streaming | chat-service ChatStreamController | Only emits "done" event, no token-by-token chunks |
| File embedding | file-service FileChunk | pgvector extension enabled in memory-service but NOT in file-service — no embedding column |

---

## 7. Implementation Plan — Remaining Backend Work

### Phase A: Memory Extraction (Priority: P0)

**Goal**: Make handleMessageCompleted actually extract facts/preferences/instructions from conversations using Ollama.

**Changes**:
1. memory-service AppConfig: Add `OLLAMA_SERVICE_URL`
2. memory-service: New `MemoryExtractionManager` that calls Ollama with extraction prompt
3. memory-service handleMessageCompleted: Call extraction manager, store extracted memories
4. Extraction prompt: Ask Ollama to return JSON array of `{ type, content }` extracted from the assistant response
5. Zod validate Ollama response, discard invalid entries
6. Publish `memory.extracted` event for each extracted memory

**env changes**: Add `OLLAMA_SERVICE_URL` to memory-service AppConfig, .env, .env.example, install scripts

### Phase B: Context Pack Thread Attachment (Priority: P0)

**Changes**:
1. chat-service Prisma: Add `contextPackIds String[]` to ChatThread
2. chat-service DTOs: Add `contextPackIds` to create/update thread DTOs
3. chat-service handleMessageRouted: Pass `thread.contextPackIds` to ContextAssemblyManager
4. Frontend: Add context pack selector in thread settings
5. Frontend types: Add `contextPackIds` to ChatThread type

### Phase C: Wire Ollama Role Assignments into Routing (Priority: P1)

**Changes**:
1. routing-service AppConfig: Already has OLLAMA_SERVICE_URL
2. routing-service: On startup, fetch ROUTER role model from ollama-service
3. OllamaRouterManager: Use the assigned router model instead of config default
4. Add internal endpoint to ollama-service: `GET /api/v1/internal/ollama/router-model`

### Phase D: RabbitMQ Resilience (Priority: P1)

**Changes**:
1. shared-rabbitmq: Add DLX (dead-letter exchange) setup on channel creation
2. shared-rabbitmq: Add retry logic with exponential backoff (3 retries, then DLQ)
3. shared-rabbitmq: Add message TTL (24 hours)
4. Add `RABBITMQ_RETRY_COUNT` and `RABBITMQ_RETRY_DELAY_MS` to .env

### Phase E: Capability-Based Route Validation (Priority: P1)

**Changes**:
1. routing-service: Before finalizing route, query connector-service for model capabilities
2. If message contains image/file references, filter models without supportsVision
3. If routing to a model that doesn't support the required capability, try next in fallback chain
4. Add internal endpoint: `GET /api/v1/internal/connectors/model-capabilities?provider=X&model=Y`

---

## 8. Security / Reliability / Performance

### Current Security Posture
- JWT auth with refresh rotation: REAL
- RBAC with 3 roles (ADMIN, OPERATOR, USER): REAL
- Rate limiting (100 req/min configurable): REAL
- Helmet security headers: REAL
- Zod input validation: REAL (all DTOs)
- Prisma ORM (no raw SQL): REAL
- Secret encryption (AES-256-GCM for connector configs): REAL
- Log redaction (passwords, tokens, API keys): REAL
- CORS with configurable origins: REAL

### Missing Security Controls
- No HTTPS/TLS termination at Nginx (dev-only HTTP)
- No request signing between services (internal endpoints are @Public)
- No IP allowlisting for internal endpoints
- No audit log for admin actions (user create, role change)

### Reliability Concerns
- RabbitMQ message loss on handler failure (nack without requeue)
- No circuit breaker for HTTP calls to providers
- All file processing is synchronous (blocks request thread)
- No database connection pooling configuration visible

### Performance Considerations
- 7 PostgreSQL instances (~200MB RAM each, ~1.4GB total)
- Ollama router adds 1-5s latency per AUTO-routed message
- No caching of connector configs (fetched on every cloud provider call)
- No caching of Ollama router model assignment

---

## 9. Testing Assessment

| Service | Test Files | Tests | Coverage |
|---------|-----------|-------|----------|
| auth-service | 8 | 77 | Guards, JWT, DTOs, auth manager, user service |
| chat-service | 5 | 55 | DTOs, messages service, threads service |
| connector-service | 4 | 46 | DTOs, manager, service |
| routing-service | 3 | 29 | Routing manager, routing service |
| memory-service | 4 | 48 | Memory service, context packs service |
| file-service | 3 | 22 | File processing, files service |
| ollama-service | 3 | 12 | Ollama manager (env-dependent failure) |
| audit-service | 4 | 22 | Event manager, services |
| health-service | 1 | 1 | Smoke test only |
| client-logs-service | 0 | 0 | NO TESTS |
| server-logs-service | 0 | 0 | NO TESTS |
| **Total** | **35** | **312** | |

### Missing Test Types
- Integration tests (cross-service event flow)
- E2E tests (Playwright infrastructure exists but empty)
- API contract tests
- Load/performance tests
- Failure mode tests (provider timeout, RabbitMQ down, DB down)

---

## 10. Release Gates

| Gate | Status | Blocking? |
|------|--------|-----------|
| Typecheck passes (0 errors) | PASS | No |
| Lint passes (0 errors) | PASS | No |
| Build succeeds | PASS | No |
| 312 unit tests pass | PASS | No |
| Rate limiting enabled | PASS | No |
| Helmet security headers | PASS | No |
| Memory extraction real | FAIL (stub) | YES |
| Context packs attachable to threads | FAIL (no schema field) | YES |
| Ollama roles consumed by routing | FAIL (unused) | YES |
| RabbitMQ retry/DLQ | FAIL (messages discarded) | YES for production |
| E2E tests | FAIL (none exist) | YES for production |
| CI/CD pipeline | PASS (GitHub Actions) | No |

---

## 11. Final Verification Checklist

| Requirement | Status |
|-------------|--------|
| Context assembled before execution | REAL — ContextAssemblyManager fetches memories + file chunks |
| Routing decisions persisted | REAL — RoutingDecision table stores every decision |
| Every assistant message has provider/model | REAL — stored on ChatMessage record |
| File ingestion is real | PARTIAL — chunking works, no embeddings |
| Memory extraction is async and auditable | STUB — handler just logs |
| Logs emitted on every critical transition | REAL — StructuredLogger used throughout |
| Fallback paths explicit and safe | REAL — fallback chain with multiple providers |
| Background jobs for heavy operations | MISSING — all synchronous |
| Dead letter handling | MISSING — failed messages discarded |
| Circuit breaker for providers | MISSING — no circuit breaker |
