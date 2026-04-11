# Technical Debt Register

## Overview

This register tracks all known technical debt items in ClawAI, organized by category with severity, estimated effort, and priority. Each item includes actionable remediation steps.

Last updated: 2026-04-11

---

## Severity Scale

| Level | Meaning |
| --- | --- |
| Critical | Blocks production readiness or poses active security risk |
| High | Significant quality or maintenance concern; address before GA |
| Medium | Noticeable issue; plan for next quarter |
| Low | Minor improvement; address opportunistically |

## Effort Scale

| Level | Meaning |
| --- | --- |
| Low | < 1 day |
| Medium | 1-3 days |
| High | 3-5 days |
| Very High | 1-2 weeks |

---

## 1. Code Quality

### TD-001: ChatExecutionManager Cyclomatic Complexity

- **Severity**: High
- **Effort**: Medium
- **Location**: `apps/claw-chat-service/src/modules/chat-messages/managers/chat-execution.manager.ts`
- **Detail**: Cyclomatic complexity of 17 (ESLint manager limit is 15). The execution method handles provider selection, fallback logic, streaming, error handling, and metric recording in a single flow.
- **Impact**: Difficult to test individual paths; high regression risk.
- **Remediation**: Extract provider-specific execution into strategy classes. Separate fallback chain logic into a dedicated `FallbackExecutor` utility. Break metric recording into a post-execution hook.

### TD-002: handleMessageRouted Method Length

- **Severity**: Medium
- **Effort**: Low
- **Location**: `apps/claw-chat-service/src/modules/chat-messages/` (RabbitMQ consumer)
- **Detail**: 51 lines (ESLint service limit is 30 lines per method).
- **Impact**: Too many responsibilities in one method.
- **Remediation**: Split into `assembleContext()`, `executeCompletion()`, `storeResponse()`, and `publishCompletion()` private methods.

### TD-003: detectImageFollowUp Complexity

- **Severity**: High
- **Effort**: Medium
- **Location**: `apps/claw-chat-service/src/modules/chat-messages/`
- **Detail**: 55 lines with cyclomatic complexity of 28. Multiple nested conditionals.
- **Impact**: Extremely fragile; nearly untestable.
- **Remediation**: Extract pattern definitions to constants. Convert to rule-based pattern matcher. Each rule independently testable.

### TD-004: Pre-existing ESLint Warnings

- **Severity**: Low
- **Effort**: Low
- **Location**: Various services
- **Detail**: Multiple `prefer-nullish-coalescing` and `no-shadow` warnings.
- **Impact**: Minor; code works correctly.
- **Remediation**: Fix during regular refactoring, one service at a time.

---

## 2. Test Coverage

### TD-005: Manager Classes Under-Tested

- **Severity**: High
- **Effort**: High
- **Location**: All services with manager classes (chat, routing, memory, ollama)
- **Detail**: Manager classes contain the most complex logic but have the lowest coverage. `ChatExecutionManager` and `ContextAssemblyManager` particularly under-tested.
- **Impact**: High-risk code paths not validated; refactoring is dangerous.
- **Remediation**: Integration tests for each manager. Mock external calls. Target >80% branch coverage.

### TD-006: Frontend Component Tests

- **Severity**: Medium
- **Effort**: Medium
- **Location**: `apps/claw-frontend/src/components/`
- **Detail**: Chat components lack interaction tests. Most tests cover render-only.
- **Impact**: UI regressions not caught until E2E or manual testing.
- **Remediation**: Add Vitest + Testing Library tests for sending messages, model selection, file attachment.

### TD-007: E2E Test Coverage

- **Severity**: Medium
- **Effort**: High
- **Location**: Playwright tests
- **Detail**: Only happy path for login and basic chat. No error scenarios, fallback chains, or admin workflows.
- **Impact**: Integration-level bugs may reach production.
- **Remediation**: Add scenarios for provider failure + fallback, connector CRUD, routing policies, file upload.

---

## 3. Security

### TD-008: JWT Stored in localStorage

- **Severity**: High
- **Effort**: High
- **Location**: `apps/claw-frontend/src/stores/auth.store.ts`
- **Detail**: JWT tokens in localStorage are vulnerable to XSS.
- **Impact**: If any XSS vulnerability exists, all sessions are compromised.
- **Remediation**: Migrate to HTTP-only cookies. Requires: auth-service Set-Cookie headers, Nginx cookie forwarding, frontend cookie-based auth, CORS `credentials: include`.

### TD-009: No CSRF Protection

- **Severity**: Medium (conditional)
- **Effort**: Medium
- **Location**: All services
- **Detail**: No CSRF tokens. Currently mitigated by JWT in Authorization headers. Becomes critical if TD-008 is implemented.
- **Impact**: Low risk currently; high risk after cookie migration.
- **Remediation**: Implement CSRF tokens (double-submit cookie) simultaneously with TD-008.

### TD-010: Rate Limiting per User vs Global

- **Severity**: Medium
- **Effort**: Medium
- **Location**: All services (Throttler configuration)
- **Detail**: Rate limiting is per-IP, not per-user. A single user could consume the entire allocation.
- **Impact**: Potential for authenticated abuse.
- **Remediation**: Use JWT user ID as throttle key. Different limits per endpoint.

---

## 4. Performance

### TD-011: Context Assembly N+1 HTTP Calls

- **Severity**: High
- **Effort**: Medium
- **Location**: `apps/claw-chat-service/src/modules/chat-messages/managers/context-assembly.manager.ts`
- **Detail**: Separate HTTP calls to memory-service, file-service for each attached resource.
- **Impact**: Latency increases linearly (500ms-1s with 5 files + 3 packs).
- **Remediation**: Batch endpoints in memory-service and file-service. Accept arrays of IDs.

### TD-012: Ollama Router Timeout Impact

- **Severity**: Medium
- **Effort**: Medium
- **Location**: `apps/claw-routing-service/`
- **Detail**: 10-second fixed timeout. Under load, all AUTO messages wait max time.
- **Impact**: User-perceived latency spikes.
- **Remediation**: Adaptive timeout based on recent response times. LRU cache for similar prompts. Consider reducing to 5 seconds.

### TD-013: Large Thread History in Memory

- **Severity**: Medium
- **Effort**: Medium
- **Location**: Chat service context assembly
- **Detail**: Entire message history loaded, then truncated. Wasteful for 100+ message threads.
- **Impact**: Memory pressure under concurrency.
- **Remediation**: Cursor-based pagination. Load most recent N messages first.

---

## 5. Scalability

### TD-014: Single-Instance Services

- **Severity**: High
- **Effort**: High
- **Location**: All 13 services (Docker Compose)
- **Detail**: Each service is a single container. No horizontal scaling or load balancing.
- **Impact**: Single failure causes feature outage. Cannot handle traffic spikes.
- **Remediation**: Health check-based restart policies. Kubernetes migration plan. PgBouncer for connection pooling.

### TD-015: Single RabbitMQ Instance

- **Severity**: Medium
- **Effort**: High
- **Location**: `docker-compose.dev.yml`
- **Detail**: No clustering, no mirrored queues.
- **Impact**: RabbitMQ crash stops all async communication.
- **Remediation**: 3-node cluster with quorum queues. Publisher confirms (already done).

### TD-016: No Database Connection Pooling

- **Severity**: Medium
- **Effort**: Medium
- **Location**: All PostgreSQL services
- **Detail**: Prisma internal pool (5 connections). Can exhaust under load.
- **Impact**: Connection errors under concurrent load.
- **Remediation**: PgBouncer per PostgreSQL instance.

---

## 6. Infrastructure

### TD-017: No Automated Backup Strategy

- **Severity**: Critical
- **Effort**: Medium
- **Location**: All databases (9 PG + 3 MongoDB)
- **Detail**: No automated backup or point-in-time recovery.
- **Impact**: Data loss on disk failure or corruption.
- **Remediation**: pg_dump cron jobs (daily, 30-day retention). mongodump for MongoDB. Off-host storage (S3). Test restore quarterly.

### TD-018: No Log Rotation for Container Logs

- **Severity**: Low
- **Effort**: Low
- **Location**: Docker Compose configuration
- **Detail**: Container logs grow unbounded.
- **Impact**: Disk space exhaustion over time.
- **Remediation**: Add `logging: { driver: json-file, options: { max-size: 50m, max-file: 5 } }` to compose files.

### TD-019: Hardcoded Default Model List

- **Severity**: Low
- **Effort**: Low
- **Location**: `apps/claw-ollama-service/`
- **Detail**: 5 default models hardcoded. Now configurable via `AUTO_PULL_MODELS` env var.
- **Impact**: Low; resolved via environment variable.
- **Remediation**: Already partially addressed. Consider admin UI configuration.

### TD-020: No Graceful Shutdown Handling

- **Severity**: Medium
- **Effort**: Medium
- **Location**: All services
- **Detail**: No NestJS `onApplicationShutdown` hooks. RabbitMQ consumers not drained.
- **Impact**: In-flight messages lost during deployments.
- **Remediation**: Implement shutdown hooks. Drain consumers. Set Docker stop grace period to 30s.

---

## Priority Matrix

| Priority | Items | Action |
| --- | --- | --- |
| **Immediate** | TD-017 | Implement automated backups this week |
| **Next Sprint** | TD-008, TD-014, TD-001, TD-003, TD-005, TD-011 | Schedule for next iteration |
| **Planned** | TD-002, TD-010, TD-012, TD-013, TD-015, TD-016, TD-020, TD-006, TD-007 | Add to backlog |
| **Conditional** | TD-009 | Implement with TD-008 |
| **Opportunistic** | TD-004, TD-018, TD-019 | Fix when touching related code |
