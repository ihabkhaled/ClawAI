# Risk Register

Comprehensive risk assessment for the ClawAI platform. Each risk is evaluated for likelihood (1-5) and impact (1-5), producing a risk score (L x I). Risks scoring 15+ require immediate mitigation.

Last updated: 2026-04-09

---

## Risk Scoring

| Score | Likelihood     | Impact     |
| ----- | -------------- | ---------- |
| 1     | Rare           | Negligible |
| 2     | Unlikely       | Minor      |
| 3     | Possible       | Moderate   |
| 4     | Likely         | Major      |
| 5     | Almost certain | Severe     |

**Risk Rating**: Low (1-6), Medium (7-12), High (13-19), Critical (20-25)

---

## 1. Operational Risks

### OPS-001: Ollama Service Unavailable

- **Description**: Ollama runtime crashes, runs out of memory, or becomes unresponsive. Affects all local AI operations including AUTO routing, memory extraction, and LOCAL_ONLY chat.
- **Likelihood**: 3 (Possible -- Ollama is a relatively new runtime; large model loads can exhaust GPU/CPU memory)
- **Impact**: 4 (Major -- AUTO routing falls back to heuristic; LOCAL_ONLY mode completely breaks; memory extraction stops)
- **Risk Score**: 12 (Medium)
- **Mitigation**:
  - Heuristic fallback is already implemented for AUTO routing (10s timeout).
  - Health service monitors Ollama availability.
  - Docker restart policy (`restart: unless-stopped`) recovers from crashes.
  - Configure memory limits for Ollama container to prevent OOM kills.
  - Consider running a second Ollama instance for redundancy.
- **Owner**: Platform/Infrastructure team
- **Status**: Partially mitigated (fallback exists, monitoring exists, redundancy not implemented)

### OPS-002: Cloud Provider API Outage

- **Description**: One or more cloud AI providers (OpenAI, Anthropic, Google, DeepSeek) experience an outage or rate limiting.
- **Likelihood**: 3 (Possible -- cloud provider outages occur several times per year)
- **Impact**: 3 (Moderate -- fallback chain routes to alternative providers; local Ollama available as last resort)
- **Risk Score**: 9 (Medium)
- **Mitigation**:
  - Fallback chain in ChatExecutionManager tries alternative provider on failure.
  - Connector health checks detect unhealthy providers and remove them from routing.
  - Routing modes PRIVACY_FIRST, LOCAL_ONLY, and COST_SAVER prefer local by default.
  - Monitor provider status pages; alert on consecutive failures.
- **Owner**: Platform team
- **Status**: Mitigated (fallback chain operational)

### OPS-003: Database Disk Full

- **Description**: PostgreSQL or MongoDB data directories exhaust available disk space, causing write failures.
- **Likelihood**: 3 (Possible -- 8 PG + 3 Mongo databases, chat messages and logs grow continuously)
- **Impact**: 5 (Severe -- write failures cascade; messages cannot be saved; audit trail breaks)
- **Risk Score**: 15 (High)
- **Mitigation**:
  - MongoDB logs have TTL indexes (30 days) for automatic cleanup.
  - Monitor disk usage per database volume.
  - Implement disk usage alerts at 70% and 90% thresholds.
  - Plan data archival strategy for chat messages and audit logs.
  - Separate database volumes from application volumes in Docker.
- **Owner**: Infrastructure team
- **Status**: Partially mitigated (TTL on logs; no alerting; no archival)

### OPS-004: RabbitMQ Queue Backlog

- **Description**: Consumer services fall behind, causing message queues to grow unboundedly. Memory pressure on RabbitMQ node.
- **Likelihood**: 2 (Unlikely -- current message volumes are low)
- **Impact**: 4 (Major -- delayed message processing; routing decisions stale; memory extraction backlog; potential RabbitMQ crash)
- **Risk Score**: 8 (Medium)
- **Mitigation**:
  - DLQ with 3 retries prevents poison messages from blocking queues.
  - Monitor queue depths via RabbitMQ management plugin (port 15672).
  - Set queue length limits with overflow policy (`reject-publish` or `drop-head`).
  - Scale consumer instances horizontally when needed.
- **Owner**: Platform team
- **Status**: Partially mitigated (DLQ exists; monitoring available; no alerting configured)

### OPS-005: Container Orchestration Failure

- **Description**: Docker daemon crashes, host reboots, or Docker Compose state becomes inconsistent.
- **Likelihood**: 2 (Unlikely -- Docker is mature; but dev environment runs 22+ containers)
- **Impact**: 5 (Severe -- complete system outage)
- **Risk Score**: 10 (Medium)
- **Mitigation**:
  - All containers have `restart: unless-stopped` policy.
  - `claw.sh status` script checks all service health.
  - Document recovery procedure: `docker compose down && docker compose up -d`.
  - Consider container orchestrator (Kubernetes, Docker Swarm) for production.
- **Owner**: Infrastructure team
- **Status**: Partially mitigated (restart policies exist; no orchestrator)

---

## 2. Security Risks

### SEC-001: JWT Tokens in localStorage

- **Description**: JWT access and refresh tokens stored in browser localStorage are accessible to any JavaScript running on the page, making them vulnerable to XSS attacks.
- **Likelihood**: 2 (Unlikely -- application uses React which escapes output; no `dangerouslySetInnerHTML` usage; CSP headers via Helmet)
- **Impact**: 5 (Severe -- full account takeover; attacker can impersonate any user)
- **Risk Score**: 10 (Medium)
- **Mitigation**:
  - Helmet security headers reduce XSS surface.
  - React's built-in XSS protection (output escaping).
  - ESLint rule `react/no-danger` prevents `dangerouslySetInnerHTML`.
  - Short access token expiry (configurable via JWT_ACCESS_EXPIRY).
  - Refresh token rotation invalidates old tokens.
  - Long-term: migrate to HTTP-only cookies (see Technical Debt TD-008).
- **Owner**: Security/Backend team
- **Status**: Risk accepted with compensating controls; migration planned

### SEC-002: API Key Storage and Access

- **Description**: Cloud provider API keys are stored encrypted (AES-256-GCM) in PostgreSQL. Encryption key is in environment variable. Compromise of ENCRYPTION_KEY exposes all provider credentials.
- **Likelihood**: 2 (Unlikely -- env vars are not committed; access requires server compromise)
- **Impact**: 5 (Severe -- attacker gains access to all configured AI provider accounts; potential financial abuse)
- **Risk Score**: 10 (Medium)
- **Mitigation**:
  - AES-256-GCM encryption at rest.
  - ENCRYPTION_KEY is 64 hex chars (256-bit).
  - Log redaction prevents key leakage in logs.
  - Principle of least privilege: only connector-service accesses encrypted keys.
  - Long-term: migrate to a secrets manager (HashiCorp Vault, AWS Secrets Manager).
- **Owner**: Security team
- **Status**: Mitigated with encryption; secrets manager planned

### SEC-003: Insufficient Input Validation Depth

- **Description**: While all inputs are Zod-validated, some string fields may not have adequate length or content restrictions, potentially enabling injection or abuse.
- **Likelihood**: 2 (Unlikely -- Zod validation is enforced; Prisma ORM prevents SQL injection)
- **Impact**: 3 (Moderate -- potential for oversized payloads, slow queries on large text fields)
- **Risk Score**: 6 (Low)
- **Mitigation**:
  - Zod schemas require `.max()` on all strings and arrays (enforced by code review).
  - Prisma ORM parameterizes all queries.
  - Rate limiting prevents volumetric abuse.
  - Review all DTO schemas for adequate length limits.
- **Owner**: Backend team
- **Status**: Mitigated

### SEC-004: Inter-Service Communication Not Authenticated

- **Description**: HTTP calls between services (e.g., chat calling memory-service for context) do not carry authentication tokens. Any process on the Docker network can call internal service endpoints.
- **Likelihood**: 2 (Unlikely -- Docker network isolation in production; no external exposure of internal ports)
- **Impact**: 3 (Moderate -- unauthorized data access between services if network is compromised)
- **Risk Score**: 6 (Low)
- **Mitigation**:
  - Docker network isolation (services not exposed to host except through Nginx).
  - Nginx only routes external traffic to defined paths.
  - Long-term: implement mutual TLS or shared secret for inter-service calls.
- **Owner**: Infrastructure/Security team
- **Status**: Risk accepted; network isolation sufficient for current deployment model

---

## 3. Reliability Risks

### REL-001: Single Points of Failure

- **Description**: Every service, database, and infrastructure component runs as a single instance. Any component failure causes partial or total outage.
- **Likelihood**: 3 (Possible -- hardware/software failures are inevitable over time)
- **Impact**: 4 (Major -- feature-level outage for service failures; total outage for shared infrastructure failures)
- **Risk Score**: 12 (Medium)
- **Mitigation**:
  - Docker restart policies for automatic recovery.
  - Health service aggregates status for monitoring.
  - Stateless service design enables future horizontal scaling.
  - Plan Kubernetes migration for production HA requirements.
- **Owner**: Infrastructure team
- **Status**: Partially mitigated; HA not implemented

### REL-002: No Horizontal Scaling

- **Description**: Services cannot scale horizontally. Under load, individual services become bottlenecks.
- **Likelihood**: 3 (Possible -- depends on user count and message volume)
- **Impact**: 3 (Moderate -- degraded performance; slow response times; potential timeouts)
- **Risk Score**: 9 (Medium)
- **Mitigation**:
  - Services are stateless (sessions in DB, no in-memory state beyond caches).
  - RabbitMQ consumers support competing consumers pattern (multiple instances can share a queue).
  - Database connection pooling needed before scaling (PgBouncer).
  - Monitor response times and queue depths to anticipate scaling needs.
- **Owner**: Platform team
- **Status**: Architecture supports scaling; infrastructure does not yet implement it

### REL-003: Cascading Failure from Shared Infrastructure

- **Description**: Redis, RabbitMQ, or Nginx failure affects all services simultaneously.
- **Likelihood**: 2 (Unlikely -- these are mature, stable components)
- **Impact**: 5 (Severe -- Redis down breaks caching/rate limiting; RabbitMQ down stops all async; Nginx down stops all external access)
- **Risk Score**: 10 (Medium)
- **Mitigation**:
  - Services degrade gracefully when Redis is unavailable (rate limiting falls back to in-memory).
  - RabbitMQ publisher retry logic handles transient outages.
  - Nginx is the simplest component with the lowest failure rate.
  - Production plan: Redis Sentinel, RabbitMQ cluster, Nginx with keepalived.
- **Owner**: Infrastructure team
- **Status**: Graceful degradation partially implemented; clustering not implemented

---

## 4. Data Risks

### DAT-001: No Automated Backup Strategy

- **Description**: No automated backup or point-in-time recovery for any database. Manual intervention required to create backups.
- **Likelihood**: 4 (Likely -- without automated backups, the probability of needing one and not having it increases over time)
- **Impact**: 5 (Severe -- permanent data loss; user conversations, memories, audit trail, connector configs all lost)
- **Risk Score**: 20 (Critical)
- **Mitigation**:
  - Implement automated daily backups immediately (pg_dump, mongodump).
  - Test restore procedure within 2 weeks of implementation.
  - Store backups in a separate location (different disk, cloud storage).
  - Implement point-in-time recovery for PostgreSQL (WAL archiving).
  - Document and drill recovery procedures quarterly.
- **Owner**: Infrastructure team
- **Status**: NOT MITIGATED -- highest priority

### DAT-002: Prisma Migration Failures

- **Description**: Schema migrations fail mid-execution, leaving the database in an inconsistent state.
- **Likelihood**: 2 (Unlikely -- Prisma migrations are transactional on PostgreSQL)
- **Impact**: 4 (Major -- service cannot start; requires manual database intervention)
- **Risk Score**: 8 (Medium)
- **Mitigation**:
  - Prisma runs migrations in transactions (PostgreSQL supports transactional DDL).
  - Always test migrations on a copy of production data before deploying.
  - Keep rollback migration scripts for each schema change.
  - Never modify existing migration files (create new ones only).
  - Have a documented procedure for manual migration recovery.
- **Owner**: Backend team
- **Status**: Partially mitigated (transactional DDL; no rollback scripts; no pre-production testing)

### DAT-003: Connector Configuration Data Loss

- **Description**: Loss of encrypted connector configurations (API keys, endpoints). Re-entry requires users to reconfigure all cloud provider connections.
- **Likelihood**: 2 (Unlikely -- requires database corruption or deletion)
- **Impact**: 4 (Major -- all cloud AI access lost until reconfigured; admin must re-enter all API keys)
- **Risk Score**: 8 (Medium)
- **Mitigation**:
  - Database backups (when implemented) cover this.
  - Document which connectors are configured as part of operational runbook.
  - Consider export/import functionality for connector configs (encrypted).
- **Owner**: Backend/Infrastructure team
- **Status**: Not mitigated (depends on DAT-001 backup implementation)

### DAT-004: MongoDB TTL Data Premature Expiry

- **Description**: Log data in MongoDB expires after 30 days via TTL indexes. If an audit investigation requires data older than 30 days, it is already purged.
- **Likelihood**: 3 (Possible -- audit investigations often look at events from months ago)
- **Impact**: 3 (Moderate -- audit trail incomplete; compliance implications)
- **Risk Score**: 9 (Medium)
- **Mitigation**:
  - Audit logs (claw_audit) do NOT have TTL; only client-logs and server-logs have 30-day TTL.
  - Verify audit log retention is indefinite.
  - Implement log archival to cold storage before TTL expiry if extended retention needed.
  - Make TTL configurable via environment variable.
- **Owner**: Platform team
- **Status**: Partially mitigated (audit logs retained; operational logs expire)

---

## 5. Performance Risks

### PERF-001: Large Context Assembly Latency

- **Description**: Context assembly for messages with many attached files, context packs, and long thread history can take several seconds due to sequential HTTP calls and memory-intensive string operations.
- **Likelihood**: 3 (Possible -- power users with large knowledge bases)
- **Impact**: 3 (Moderate -- user-perceived delay of 2-5 seconds before AI starts responding)
- **Risk Score**: 9 (Medium)
- **Mitigation**:
  - Parallelize HTTP calls to memory-service and file-service where possible.
  - Implement batch fetch endpoints to reduce round trips.
  - Cache frequently accessed context packs in Redis.
  - Set reasonable limits on attached files (currently limited by Zod array max).
  - Show a "preparing context" indicator in the frontend.
- **Owner**: Backend team
- **Status**: Not mitigated; serial HTTP calls remain

### PERF-002: Slow Ollama Model Loading

- **Description**: Ollama loads models into memory on first request. Cold start for a 3-4GB model takes 10-30 seconds depending on hardware.
- **Likelihood**: 4 (Likely -- happens after every container restart or model switch)
- **Impact**: 2 (Minor -- first request is slow; subsequent requests are fast)
- **Risk Score**: 8 (Medium)
- **Mitigation**:
  - Ollama keeps recently used models in memory.
  - Pre-warm the router model (gemma3:4b) on startup via a health check call.
  - Document expected cold start behavior for operators.
  - Frontend shows appropriate loading state during cold starts.
- **Owner**: Platform team
- **Status**: Partially mitigated (Ollama memory caching; no explicit pre-warming)

### PERF-003: Memory Extraction Backlog

- **Description**: Memory extraction via Ollama processes each completed message asynchronously. Under high message volume, extraction falls behind, consuming Ollama resources needed for chat.
- **Likelihood**: 2 (Unlikely -- current message volumes are low)
- **Impact**: 3 (Moderate -- memory extraction delayed; Ollama resource contention with chat)
- **Risk Score**: 6 (Low)
- **Mitigation**:
  - Memory extraction is async (RabbitMQ) -- does not block the chat response.
  - DLQ prevents failed extractions from blocking the queue.
  - Consider dedicated Ollama instance for background tasks.
  - Implement extraction batching (process multiple messages in one Ollama call).
- **Owner**: Backend team
- **Status**: Risk accepted; async design limits impact

---

## 6. Business Risks

### BIZ-001: Provider API Breaking Changes

- **Description**: Cloud AI providers (OpenAI, Anthropic, Google, DeepSeek) change their APIs, deprecate models, or alter pricing without adequate notice.
- **Likelihood**: 3 (Possible -- providers update APIs regularly; model deprecations are common)
- **Impact**: 3 (Moderate -- specific provider stops working until adapter is updated; other providers continue)
- **Risk Score**: 9 (Medium)
- **Mitigation**:
  - Provider-specific adapters isolate API changes to one module.
  - Connector health checks detect failures quickly.
  - Fallback chains ensure alternative providers are available.
  - Monitor provider changelog and deprecation notices.
  - Pin provider SDK versions; test upgrades in staging.
- **Owner**: Backend team
- **Status**: Mitigated by architecture (adapter pattern + fallback)

### BIZ-002: Cloud AI Cost Overruns

- **Description**: Unrestricted usage of expensive cloud AI models (e.g., claude-opus-4, gpt-4o) leads to unexpectedly high API bills.
- **Likelihood**: 3 (Possible -- no per-user or global spending limits implemented)
- **Impact**: 4 (Major -- financial impact; potential service suspension by provider)
- **Risk Score**: 12 (Medium)
- **Mitigation**:
  - Usage ledger in audit-service tracks all API calls with provider and model.
  - Routing modes (COST_SAVER, LOCAL_ONLY) provide cost control options.
  - Implement spending alerts based on usage ledger data.
  - Add configurable per-user and global spending limits.
  - Set provider-level spending caps in provider dashboards.
- **Owner**: Product/Platform team
- **Status**: Partially mitigated (tracking exists; no limits or alerts)

### BIZ-003: Data Privacy Compliance

- **Description**: User data sent to cloud AI providers may violate data privacy regulations (GDPR, HIPAA, etc.) depending on deployment context.
- **Likelihood**: 3 (Possible -- depends on user deployment context and data types)
- **Impact**: 5 (Severe -- legal liability; fines; reputational damage)
- **Risk Score**: 15 (High)
- **Mitigation**:
  - PRIVACY_FIRST and LOCAL_ONLY routing modes keep data local.
  - Routing engine classifies privacy sensitivity and avoids cloud for sensitive data.
  - Audit trail records which provider processed each message.
  - Document data flows for compliance review.
  - Implement data processing agreements (DPA) templates for cloud providers.
  - Add data classification labels to messages.
- **Owner**: Product/Legal team
- **Status**: Partially mitigated (local routing available; no formal compliance framework)

---

## Risk Heat Map

```
Impact
  5 |  DAT-001    SEC-001     OPS-003
    |             SEC-002     REL-003     OPS-005
  4 |  DAT-002    REL-001     BIZ-002
    |  DAT-003    REL-002     OPS-001
  3 |  SEC-004    PERF-001    BIZ-001     BIZ-003
    |  PERF-003   DAT-004     OPS-002
  2 |             SEC-003     PERF-002
    |
  1 |
    +-------------------------------------------
       1          2           3           4       5
                        Likelihood
```

---

## Top 5 Risks Requiring Immediate Action

| Rank | ID      | Risk                     | Score | Required Action                                     |
| ---- | ------- | ------------------------ | ----- | --------------------------------------------------- |
| 1    | DAT-001 | No automated backups     | 20    | Implement automated daily backups for all databases |
| 2    | OPS-003 | Database disk full       | 15    | Set up disk monitoring and alerting                 |
| 3    | BIZ-003 | Data privacy compliance  | 15    | Document data flows; implement classification       |
| 4    | REL-001 | Single points of failure | 12    | Plan HA strategy; implement health-based restarts   |
| 5    | BIZ-002 | Cloud AI cost overruns   | 12    | Implement spending alerts and limits                |
