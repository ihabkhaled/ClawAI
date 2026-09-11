# Technical Debt Register

Tracking known technical debt, pre-existing warnings, and areas needing improvement. Each item includes severity, impact, and recommended action.

Last updated: 2026-09-10

> **Two files, one subject.** This document and
> [`technical-debt-register.md`](technical-debt-register.md) both enumerate
> TD-001…TD-020 with near-identical content and have been maintained
> independently. `docs/README.md` indexes **this** file, so anything written only
> into the register is unreachable from the docs index. Until the two are
> reconciled, an entry added to one belongs in both. Noted 2026-09-10 when
> TD-030 was added to the register alone and could not be found from any index.

---

## Open programme

### TD-031: Outbound fetch has no DNS-level SSRF guard (2026-09-11)

- **Severity**: High · **Effort**: Medium · **Priority**: Next
- **Detail**: `assertSafeOutboundUrl` is a **syntactic** check. It now rejects
  every literal spelling of a private address — dotted quad, decimal, hex,
  octal, short form, IPv6 loopback, unique-local, link-local, IPv4-mapped —
  plus internal name suffixes, bare LAN labels and every cloud metadata
  endpoint. What it cannot do is resolve DNS: **a hostname an attacker controls
  can resolve to 127.0.0.1 and pass every check.** The redirect target is
  re-checked after the fact, which closes redirect-based escape, but a first
  request to an attacker-owned name is still made before anything resolves it.
- **Why it matters now**: until 2026-09-11 every URL the fetcher saw came from a
  search provider, so syntax-only was a defensible depth. The platform then
  learned to open a URL the user typed
  ([ADR-091](../13-adr/adr-091-user-urls-are-opened-not-searched.md)), and the
  address became attacker-chosen.
- **The fix**: a socket-level guard — resolve the host, check every returned
  address against the private ranges, and pin the connection to the address that
  was checked so the name cannot be re-resolved to something else between the
  check and the connect (DNS rebinding). In Node that is a custom
  `lookup`/agent on the fetch client.
- **Interim mitigation**: private addresses are refused unless the operator
  named the host in `RESEARCH_DOMAIN_ALLOWLIST`, cloud metadata is refused
  unconditionally, redirects are re-validated, and the response body is capped.
  A successful rebind therefore reaches an internal HTTP service but still
  cannot reach cloud credentials.
- **Where**: `apps/claw-research-service/src/common/utilities/url-safety.utility.ts`,
  `apps/claw-research-service/src/modules/fetch/adapters/http-fetch.adapter.ts`.
- **Rule**: [`rules/41-web-evidence-truthfulness.md`](../../rules/41-web-evidence-truthfulness.md) §11.

### TD-030: Chat pipeline reliability and traffic programme (2026-09-10)

- **Severity**: Critical · **Effort**: Very High · **Priority**: Immediate
- **Detail**: A measured audit found the idle chat page issuing ~83 API requests
  per minute (148 on a thread with a stale in-flight flag), every completed
  answer costing one full-conversation re-download, one HTTP request per client
  log line, an SSE connection killed in a loop by its own stale replayed
  completion event, and **no capability to read a URL a user pasted** — fetch and
  extract exist but are wired only downstream of a keyword search.
- **Do not re-derive the causes.** They are enumerated with file and line in the
  audit, and the numbers they are judged against are in the baseline:
  - [`chat-pipeline-audit-2026-09.md`](chat-pipeline-audit-2026-09.md)
  - [`chat-pipeline-baseline-2026-09.md`](chat-pipeline-baseline-2026-09.md)
  - [`chat-pipeline-slos-2026-09.md`](chat-pipeline-slos-2026-09.md) — the objectives derived from the above, each with the guard that catches a regression
- **Sequencing constraints** (from the audit): the message-list invalidation key
  must be fixed _before_ the polling is removed, or the UI silently stops
  updating; and the client-logs service must accept an array _before_ the client
  can batch.
- **Progress**: B2/B3/B4/B7 landed 2026-09-10 — the 2-second full-thread poll,
  the duplicate simultaneous fetch, the self-arming wait loop and the dead
  invalidation key. Thread re-downloads while waiting went 30/min to 12/min at a
  single clean 5s cadence. A1/A2 landed the same day: the global
  `refetchInterval` is removed in favour of named freshness tiers, taking idle
  traffic from 83 to 2 requests per minute. D1/D2 landed the same day: a fresh
  send no longer asks the stream for a replay, and a clean close reconnects
  unless a terminal event was really seen. C landed 2026-09-10 as well —
  `POST /client-logs/batch`, duplicate collapsing, a production severity gate
  and an unload beacon took a send's telemetry from 12 requests to 1
  ([ADR-089](../13-adr/adr-089-client-telemetry-batch-endpoint.md)); C4 is only
  partly closed, because sampling and retry were deferred. Still open:
  D3 (a dead stream is silent to the user), D4 (`Last-Event-ID` resume) and
  section E (URL fetch and source truthfulness), which is the largest block.
- **Full entry**: [`technical-debt-register.md`](technical-debt-register.md) TD-030.

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
- **Location**: All 17 services (Docker Compose configuration)
- **Detail**: Each service runs as a single container instance. There is no horizontal scaling, load balancing (beyond Nginx routing), or service discovery.
- **Impact**: A single service crash causes complete feature outage. No ability to handle traffic spikes.
- **Recommendation**: For production readiness:
  1. Add health check-based restart policies to Docker Compose.
  2. Implement stateless service design (already mostly done -- sessions are in DB).
  3. Plan Kubernetes migration or Docker Swarm for horizontal scaling.
  4. Add connection pooling for database connections (PgBouncer).

### TD-015: Single RabbitMQ Instance

- **Severity**: Medium
- **Location**: `docker/docker-compose.dev.yml`
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
