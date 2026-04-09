# Technical Debt Register

Tracking known technical debt, pre-existing warnings, and areas needing improvement. Each item includes severity, impact, and recommended action.

Last updated: 2026-04-09

---

## Severity Scale

| Level        | Meaning                                                                   |
| ------------ | ------------------------------------------------------------------------- |
| **Critical** | Blocks production readiness or poses active security risk                 |
| **High**     | Significant quality or maintenance concern; should be addressed before GA |
| **Medium**   | Noticeable issue that increases maintenance burden; plan for next quarter |
| **Low**      | Minor improvement opportunity; address opportunistically                  |

---

## 1. Known Code Quality Warnings

### TD-001: ChatExecutionManager Cyclomatic Complexity

- **Severity**: High
- **Location**: `apps/claw-chat-service/src/modules/chat-messages/managers/chat-execution.manager.ts`
- **Detail**: Cyclomatic complexity of 17 (ESLint manager limit is 15). The execution method handles provider selection, fallback logic, streaming, error handling, and metric recording in a single flow.
- **Impact**: Difficult to test individual paths; high risk of regression when modifying execution logic.
- **Recommendation**: Extract provider-specific execution into strategy classes. Separate fallback chain logic into a dedicated `FallbackExecutor` utility. Break metric recording into a post-execution hook.

### TD-002: handleMessageRouted Method Length

- **Severity**: Medium
- **Location**: `apps/claw-chat-service/src/modules/chat-messages/` (RabbitMQ consumer)
- **Detail**: 51 lines (ESLint service limit is 30 lines per method). This method handles the `message.routed` event, performing context assembly, execution, response storage, and event publishing.
- **Impact**: Hard to reason about; too many responsibilities in one method.
- **Recommendation**: Split into `assembleContext()`, `executeCompletion()`, `storeResponse()`, and `publishCompletion()` private methods. The consumer handler should orchestrate these four calls.

### TD-003: detectImageFollowUp Complexity

- **Severity**: High
- **Location**: `apps/claw-chat-service/src/modules/chat-messages/`
- **Detail**: 55 lines with cyclomatic complexity of 28. Multiple nested conditionals checking message content for image-related patterns.
- **Impact**: Extremely fragile; nearly untestable at current complexity. Pattern matching logic is embedded rather than configurable.
- **Recommendation**: Extract pattern definitions to a constants file. Convert nested conditionals to a rule-based pattern matcher. Each rule should be independently testable.

### TD-004: Pre-existing ESLint Warnings

- **Severity**: Low
- **Location**: Various services
- **Detail**: Multiple `@typescript-eslint/prefer-nullish-coalescing` and `@typescript-eslint/no-shadow` warnings exist across services. These are warnings (not errors) and do not block commits.
- **Impact**: Minor; code works correctly but doesn't follow best practices.
- **Recommendation**: Address during regular refactoring. Run `npm run lint` and fix warnings one service at a time.

---

## 2. Missing Test Coverage

### TD-005: Manager Classes Under-Tested

- **Severity**: High
- **Location**: All services with manager classes (chat, routing, memory, ollama)
- **Detail**: Manager classes contain the most complex business logic but have the lowest test coverage. `ChatExecutionManager` and `ContextAssemblyManager` are particularly under-tested.
- **Impact**: High-risk code paths are not validated automatically. Refactoring these classes is dangerous without test coverage.
- **Recommendation**: Write integration tests for each manager class. Mock external service calls (HTTP, RabbitMQ) but test the orchestration logic end-to-end. Aim for >80% branch coverage on managers.

### TD-006: Frontend Component Tests

- **Severity**: Medium
- **Location**: `apps/claw-frontend/src/components/`
- **Detail**: Chat components (MessageBubble, MessageComposer, ThreadSettings) lack comprehensive interaction tests. Most tests cover render-only scenarios.
- **Impact**: UI regressions may not be caught until E2E or manual testing.
- **Recommendation**: Add Vitest + Testing Library tests for key user interactions: sending messages, selecting models, toggling settings, file attachment flows.

### TD-007: E2E Test Coverage

- **Severity**: Medium
- **Location**: Playwright tests
- **Detail**: E2E tests cover the happy path for login and basic chat but do not cover error scenarios, fallback chains, multi-provider routing, or admin workflows.
- **Impact**: Integration-level bugs may reach production.
- **Recommendation**: Add E2E scenarios for: provider failure + fallback, connector CRUD, routing policy configuration, memory extraction, file upload + chunking.

---

## 3. Security Concerns

### TD-008: JWT Stored in localStorage

- **Severity**: High
- **Location**: `apps/claw-frontend/src/stores/auth.store.ts`
- **Detail**: JWT access and refresh tokens are stored in `localStorage`. This is vulnerable to XSS attacks -- any injected script can read tokens.
- **Impact**: If an XSS vulnerability is found elsewhere in the application, all user sessions are compromised.
- **Recommendation**: Migrate to HTTP-only cookies for token storage. This requires changes to:
  1. Auth service: Set tokens as `Set-Cookie` headers with `HttpOnly`, `Secure`, `SameSite=Strict`.
  2. Nginx: Forward cookies correctly.
  3. Frontend: Remove localStorage token handling; rely on automatic cookie inclusion.
  4. CORS: Ensure `credentials: 'include'` is configured.

### TD-009: No CSRF Protection

- **Severity**: Medium
- **Location**: All services
- **Detail**: While ESLint flags CSRF detection, there is no active CSRF token implementation. The current architecture relies on JWT in Authorization headers (not cookies), which mitigates CSRF. However, if TD-008 is implemented (moving to cookies), CSRF protection becomes critical.
- **Impact**: Low risk currently; high risk if token storage changes to cookies.
- **Recommendation**: If migrating to cookies, implement CSRF tokens (double-submit cookie pattern or synchronizer token pattern) simultaneously.

### TD-010: Rate Limiting per User vs Global

- **Severity**: Medium
- **Location**: All services (NestJS Throttler configuration)
- **Detail**: Rate limiting is configured globally (100 req/min) but not per-user. A single authenticated user could consume the entire rate limit allocation for a service instance.
- **Impact**: Potential for authenticated abuse or accidental overload by power users.
- **Recommendation**: Implement per-user rate limiting using the JWT user ID as the throttle key. Configure different limits for different endpoints (e.g., chat message creation should be more restricted than reads).

---

## 4. Performance Concerns

### TD-011: Context Assembly N+1 HTTP Calls

- **Severity**: High
- **Location**: `apps/claw-chat-service/src/modules/chat-messages/managers/context-assembly.manager.ts`
- **Detail**: Context assembly makes separate HTTP calls to memory-service, file-service, and memory-service (context packs) for each message. With multiple attached files and context packs, this creates N+1 request patterns.
- **Impact**: Latency increases linearly with the number of attached resources. At 5 files + 3 context packs, context assembly adds 500ms-1s of overhead.
- **Recommendation**: Implement batch endpoints in memory-service and file-service that accept arrays of IDs. Alternatively, use RabbitMQ RPC pattern for parallel fetching.

### TD-012: Ollama Router Timeout Impact

- **Severity**: Medium
- **Location**: `apps/claw-routing-service/src/modules/routing/`
- **Detail**: Ollama router in AUTO mode has a 10-second timeout before falling back to heuristic routing. During high load, Ollama responses slow down, causing all AUTO-routed messages to wait up to 10 seconds.
- **Impact**: User-perceived latency spikes when Ollama is under load.
- **Recommendation**: Implement adaptive timeout based on recent Ollama response times. Cache routing decisions for similar prompts (LRU cache with short TTL). Consider reducing timeout to 5 seconds for interactive chat.

### TD-013: Large Thread History in Memory

- **Severity**: Medium
- **Location**: Chat service context assembly
- **Detail**: Entire thread message history is loaded into memory for context assembly, then truncated to fit token budget. For threads with 100+ messages, this loads unnecessary data.
- **Impact**: Memory pressure under high concurrency with long threads.
- **Recommendation**: Implement cursor-based pagination for thread history loading. Only load the most recent N messages initially, expanding if token budget allows.

---

## 5. Scalability Concerns

### TD-014: Single-Instance Services

- **Severity**: High
- **Location**: All 13 services (Docker Compose configuration)
- **Detail**: Each service runs as a single container instance. There is no horizontal scaling, load balancing (beyond Nginx routing), or service discovery.
- **Impact**: A single service crash causes complete feature outage. No ability to handle traffic spikes.
- **Recommendation**: For production readiness:
  1. Add health check-based restart policies to Docker Compose.
  2. Implement stateless service design (already mostly done -- sessions are in DB).
  3. Plan Kubernetes migration or Docker Swarm for horizontal scaling.
  4. Add connection pooling for database connections (PgBouncer).

### TD-015: Single RabbitMQ Instance

- **Severity**: Medium
- **Location**: `docker-compose.dev.yml`
- **Detail**: RabbitMQ runs as a single instance. No clustering, no mirrored queues.
- **Impact**: RabbitMQ crash stops all async communication. Messages in transit are lost.
- **Recommendation**: For production: deploy RabbitMQ cluster (minimum 3 nodes) with quorum queues. Configure publisher confirms and consumer acknowledgments (already implemented). Add a monitoring dashboard (management plugin is enabled).

### TD-016: No Database Connection Pooling

- **Severity**: Medium
- **Location**: All PostgreSQL services (Prisma configuration)
- **Detail**: Prisma uses its own internal connection pool (default 5 connections). Under load, this can exhaust connections or create contention.
- **Impact**: Database connection errors under concurrent load.
- **Recommendation**: Deploy PgBouncer in front of each PostgreSQL instance. Configure Prisma `connection_limit` based on expected concurrency. Monitor connection pool utilization.

---

## 6. Infrastructure Concerns

### TD-017: No Automated Backup Strategy

- **Severity**: Critical
- **Location**: All databases
- **Detail**: No automated backup or point-in-time recovery is configured for any of the 8 PostgreSQL databases or 3 MongoDB databases.
- **Impact**: Data loss on disk failure, accidental deletion, or corruption.
- **Recommendation**: Implement:
  1. `pg_dump` cron jobs for PostgreSQL (minimum daily, with 30-day retention).
  2. `mongodump` for MongoDB (daily).
  3. Test restore procedures quarterly.
  4. Store backups off-host (S3-compatible storage).

### TD-018: No Log Rotation for Container Logs

- **Severity**: Low
- **Location**: Docker Compose configuration
- **Detail**: Docker container logs grow unbounded. No `max-size` or `max-file` configuration.
- **Impact**: Disk space exhaustion over time on long-running deployments.
- **Recommendation**: Add logging driver configuration to Docker Compose:
  ```yaml
  logging:
    driver: json-file
    options:
      max-size: '50m'
      max-file: '5'
  ```

### TD-019: Hardcoded Ollama Model List

- **Severity**: Low
- **Location**: `apps/claw-ollama-service/`
- **Detail**: The 5 default Ollama models (gemma3:4b, llama3.2:3b, phi3:mini, gemma2:2b, tinyllama) are hardcoded. Adding or removing default models requires code changes.
- **Impact**: Low; admin can pull additional models manually. But the default set isn't configurable without deployment.
- **Recommendation**: Move default model list to environment variable or database-seeded configuration. Allow admin to configure default pull list via the admin UI.

### TD-020: No Graceful Shutdown Handling

- **Severity**: Medium
- **Location**: All services
- **Detail**: Services do not implement graceful shutdown hooks to drain RabbitMQ consumers, complete in-flight HTTP requests, or close database connections cleanly.
- **Impact**: In-flight messages may be lost during deployments. Database connections may leak.
- **Recommendation**: Implement NestJS `onApplicationShutdown` lifecycle hook in each service. Drain RabbitMQ consumers before closing connections. Set Docker stop grace period to 30 seconds.

---

## Debt Prioritization Matrix

| ID     | Severity | Effort | Priority                        |
| ------ | -------- | ------ | ------------------------------- |
| TD-017 | Critical | Medium | Immediate                       |
| TD-008 | High     | High   | Next sprint                     |
| TD-014 | High     | High   | Next sprint                     |
| TD-001 | High     | Medium | Next sprint                     |
| TD-003 | High     | Medium | Next sprint                     |
| TD-005 | High     | High   | Next sprint                     |
| TD-011 | High     | Medium | Next sprint                     |
| TD-002 | Medium   | Low    | Plan                            |
| TD-010 | Medium   | Medium | Plan                            |
| TD-012 | Medium   | Medium | Plan                            |
| TD-013 | Medium   | Medium | Plan                            |
| TD-015 | Medium   | High   | Plan                            |
| TD-016 | Medium   | Medium | Plan                            |
| TD-020 | Medium   | Medium | Plan                            |
| TD-006 | Medium   | Medium | Plan                            |
| TD-007 | Medium   | High   | Plan                            |
| TD-009 | Medium   | Medium | Conditional (depends on TD-008) |
| TD-004 | Low      | Low    | Opportunistic                   |
| TD-018 | Low      | Low    | Opportunistic                   |
| TD-019 | Low      | Low    | Opportunistic                   |
