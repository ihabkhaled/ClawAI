# Risk Register

## Overview

Comprehensive risk assessment for the ClawAI platform. Each risk is evaluated for likelihood (1-5) and impact (1-5), producing a risk score (L x I). Risks scoring 15+ require immediate mitigation.

Last updated: 2026-04-11

---

## Risk Scoring

| Score | Likelihood | Impact |
| --- | --- | --- |
| 1 | Rare | Negligible |
| 2 | Unlikely | Minor |
| 3 | Possible | Moderate |
| 4 | Likely | Major |
| 5 | Almost certain | Severe |

**Risk Rating**: Low (1-6), Medium (7-12), High (13-19), Critical (20-25)

---

## 1. Operational Risks

### OPS-001: Ollama Service Unavailable

| Aspect | Detail |
| --- | --- |
| Description | Ollama runtime crashes, runs out of memory, or becomes unresponsive |
| Likelihood | 3 (Possible) |
| Impact | 4 (Major -- AUTO routing degrades, LOCAL_ONLY breaks, memory extraction stops) |
| Score | 12 (Medium) |
| Mitigation | Heuristic fallback for AUTO (10s timeout). Health monitoring. Docker restart policy. Memory limits on Ollama container. |
| Status | Partially mitigated |

### OPS-002: Cloud Provider API Outage

| Aspect | Detail |
| --- | --- |
| Description | One or more cloud providers experience outage or rate limiting |
| Likelihood | 3 (Possible) |
| Impact | 3 (Moderate -- fallback chain handles it) |
| Score | 9 (Medium) |
| Mitigation | Fallback chain (primary -> fallback -> local). Connector health checks. Multiple providers configured. |
| Status | Mitigated |

### OPS-003: Database Disk Full

| Aspect | Detail |
| --- | --- |
| Description | PostgreSQL or MongoDB exhausts disk space |
| Likelihood | 3 (Possible) |
| Impact | 5 (Severe -- write failures cascade) |
| Score | 15 (High) |
| Mitigation | MongoDB TTL (30 days on logs). Disk monitoring needed. Data archival strategy needed. |
| Status | Partially mitigated |

### OPS-004: RabbitMQ Queue Backlog

| Aspect | Detail |
| --- | --- |
| Description | Consumer services fall behind, causing memory pressure on RabbitMQ |
| Likelihood | 2 (Unlikely) |
| Impact | 4 (Major -- delayed processing, potential crash) |
| Score | 8 (Medium) |
| Mitigation | DLQ with 3 retries. Queue depth monitoring available. Scale consumers horizontally when needed. |
| Status | Partially mitigated |

### OPS-005: Container Orchestration Failure

| Aspect | Detail |
| --- | --- |
| Description | Docker daemon crashes or Docker Compose state becomes inconsistent |
| Likelihood | 2 (Unlikely) |
| Impact | 5 (Severe -- complete system outage) |
| Score | 10 (Medium) |
| Mitigation | `restart: unless-stopped` on all containers. Recovery documented. Kubernetes for production. |
| Status | Partially mitigated |

---

## 2. Security Risks

### SEC-001: JWT Tokens in localStorage

| Aspect | Detail |
| --- | --- |
| Description | JWT tokens accessible to XSS attacks |
| Likelihood | 2 (Unlikely -- React escaping, CSP headers, no dangerouslySetInnerHTML) |
| Impact | 5 (Severe -- full account takeover) |
| Score | 10 (Medium) |
| Mitigation | Helmet headers. React XSS protection. Short token lifetime. Refresh rotation. httpOnly cookies planned (TD-008). |
| Status | Risk accepted; migration planned |

### SEC-002: API Key Storage

| Aspect | Detail |
| --- | --- |
| Description | ENCRYPTION_KEY compromise exposes all provider API keys |
| Likelihood | 2 (Unlikely -- env vars not committed, requires server access) |
| Impact | 5 (Severe -- financial abuse of provider accounts) |
| Score | 10 (Medium) |
| Mitigation | AES-256-GCM encryption. Log redaction. Only connector-service accesses keys. Secrets manager planned. |
| Status | Mitigated with encryption |

### SEC-003: Insufficient Input Validation

| Aspect | Detail |
| --- | --- |
| Description | Some string fields may lack adequate length restrictions |
| Likelihood | 2 (Unlikely -- Zod enforced, Prisma parameterizes) |
| Impact | 3 (Moderate -- oversized payloads, slow queries) |
| Score | 6 (Low) |
| Mitigation | Zod `.max()` on all strings/arrays. Prisma ORM. Rate limiting. |
| Status | Mitigated |

### SEC-004: Inter-Service Communication Not Authenticated

| Aspect | Detail |
| --- | --- |
| Description | Internal HTTP calls between services carry no authentication |
| Likelihood | 2 (Unlikely -- Docker network isolation) |
| Impact | 3 (Moderate -- unauthorized data access if network compromised) |
| Score | 6 (Low) |
| Mitigation | Docker network isolation. Nginx only routes external traffic. mTLS planned for production. |
| Status | Risk accepted |

---

## 3. Reliability Risks

### REL-001: Single Points of Failure

| Aspect | Detail |
| --- | --- |
| Description | Every component runs as a single instance |
| Likelihood | 3 (Possible) |
| Impact | 4 (Major -- feature or total outage) |
| Score | 12 (Medium) |
| Mitigation | Docker restart policies. Health monitoring. Stateless design enables future scaling. Kubernetes planned. |
| Status | Partially mitigated |

### REL-002: No Horizontal Scaling

| Aspect | Detail |
| --- | --- |
| Description | Services cannot scale to handle load spikes |
| Likelihood | 3 (Possible) |
| Impact | 3 (Moderate -- degraded performance) |
| Score | 9 (Medium) |
| Mitigation | Stateless services. Competing consumers in RabbitMQ. PgBouncer needed. |
| Status | Architecture ready; infrastructure not |

### REL-003: Cascading Failure

| Aspect | Detail |
| --- | --- |
| Description | Redis/RabbitMQ/Nginx failure affects all services |
| Likelihood | 2 (Unlikely) |
| Impact | 5 (Severe) |
| Score | 10 (Medium) |
| Mitigation | Graceful degradation (rate limiting fallback). RabbitMQ publisher retry. Redis Sentinel and RabbitMQ cluster for production. |
| Status | Partial |

---

## 4. Data Risks

### DAT-001: No Automated Backups

| Aspect | Detail |
| --- | --- |
| Description | No automated backup for any database |
| Likelihood | 4 (Likely -- without backups, the need increases over time) |
| Impact | 5 (Severe -- permanent data loss) |
| Score | **20 (Critical)** |
| Mitigation | **Immediate**: Implement pg_dump/mongodump daily. Test restore within 2 weeks. Store backups off-host. WAL archiving for PG. |
| Status | **NOT MITIGATED -- highest priority** |

### DAT-002: Prisma Migration Failures

| Aspect | Detail |
| --- | --- |
| Description | Schema migrations fail mid-execution |
| Likelihood | 2 (Unlikely -- PostgreSQL transactional DDL) |
| Impact | 4 (Major -- service cannot start) |
| Score | 8 (Medium) |
| Mitigation | Prisma transactions. Test on data copy. Rollback scripts. Never modify existing migrations. |
| Status | Partially mitigated |

### DAT-003: Connector Configuration Loss

| Aspect | Detail |
| --- | --- |
| Description | Loss of encrypted connector configs requires re-entering all API keys |
| Likelihood | 2 (Unlikely) |
| Impact | 4 (Major) |
| Score | 8 (Medium) |
| Mitigation | Database backups (when implemented). Document configured connectors. Export/import feature planned. |
| Status | Depends on DAT-001 |

### DAT-004: MongoDB TTL Premature Expiry

| Aspect | Detail |
| --- | --- |
| Description | Log data expires after 30 days; audit investigations may need older data |
| Likelihood | 3 (Possible) |
| Impact | 3 (Moderate -- incomplete audit trail) |
| Score | 9 (Medium) |
| Mitigation | Audit logs (claw_audit) have NO TTL. Only client/server logs expire. Archive to cold storage if needed. |
| Status | Partially mitigated |

---

## 5. Performance Risks

### PERF-001: Context Assembly Latency

| Aspect | Detail |
| --- | --- |
| Description | N+1 HTTP calls for memories, files, context packs |
| Likelihood | 3 (Possible) |
| Impact | 3 (Moderate -- 2-5s delay) |
| Score | 9 (Medium) |
| Mitigation | Parallelize HTTP calls. Batch endpoints. Redis caching for context packs. |
| Status | Not mitigated |

### PERF-002: Ollama Cold Start

| Aspect | Detail |
| --- | --- |
| Description | First request takes 10-30s for model loading |
| Likelihood | 4 (Likely) |
| Impact | 2 (Minor -- only first request) |
| Score | 8 (Medium) |
| Mitigation | Ollama memory caching. Pre-warm via health check. Document expected behavior. |
| Status | Partially mitigated |

### PERF-003: Memory Extraction Backlog

| Aspect | Detail |
| --- | --- |
| Description | Extraction falls behind under high message volume |
| Likelihood | 2 (Unlikely) |
| Impact | 3 (Moderate -- delayed extraction, Ollama contention) |
| Score | 6 (Low) |
| Mitigation | Async via RabbitMQ (non-blocking). DLQ prevents queue blocking. Dedicated Ollama instance possible. |
| Status | Risk accepted |

---

## 6. Business Risks

### BIZ-001: Provider API Breaking Changes

| Aspect | Detail |
| --- | --- |
| Description | Cloud providers change APIs or deprecate models |
| Likelihood | 3 (Possible) |
| Impact | 3 (Moderate -- one provider stops until adapter updated) |
| Score | 9 (Medium) |
| Mitigation | Adapter pattern isolates changes. Fallback chains. Monitor provider changelogs. Pin SDK versions. |
| Status | Mitigated by architecture |

### BIZ-002: Cloud AI Cost Overruns

| Aspect | Detail |
| --- | --- |
| Description | Unrestricted usage of expensive models |
| Likelihood | 3 (Possible) |
| Impact | 4 (Major -- financial impact) |
| Score | 12 (Medium) |
| Mitigation | Usage ledger tracking. COST_SAVER/LOCAL_ONLY modes. Spending alerts planned. Per-user limits planned. |
| Status | Partially mitigated |

### BIZ-003: Data Privacy Compliance

| Aspect | Detail |
| --- | --- |
| Description | Data sent to cloud providers may violate regulations |
| Likelihood | 3 (Possible) |
| Impact | 5 (Severe -- legal liability) |
| Score | **15 (High)** |
| Mitigation | PRIVACY_FIRST and LOCAL_ONLY modes. Routing transparency. Audit trail. Data classification needed. DPA templates needed. |
| Status | Partially mitigated |

---

## Risk Heat Map

```
Impact
  5 |  DAT-001(20)  SEC-001(10)  OPS-003(15)
    |               SEC-002(10)  REL-003(10)  OPS-005(10)
  4 |  DAT-002(8)   REL-001(12)  BIZ-002(12)
    |  DAT-003(8)   REL-002(9)   OPS-001(12)  OPS-004(8)
  3 |  SEC-004(6)   PERF-001(9)  BIZ-001(9)   BIZ-003(15)
    |  PERF-003(6)  DAT-004(9)   OPS-002(9)
  2 |               SEC-003(6)   PERF-002(8)
    |
  1 |
    +-------------------------------------------
       1            2            3            4       5
                         Likelihood
```

---

## Top 5 Risks Requiring Immediate Action

| Rank | ID | Risk | Score | Required Action |
| --- | --- | --- | --- | --- |
| 1 | DAT-001 | No automated backups | 20 | Implement automated daily backups for all databases |
| 2 | OPS-003 | Database disk full | 15 | Set up disk monitoring and alerting |
| 3 | BIZ-003 | Data privacy compliance | 15 | Document data flows; implement classification |
| 4 | REL-001 | Single points of failure | 12 | Plan HA strategy; implement health-based restarts |
| 5 | BIZ-002 | Cloud AI cost overruns | 12 | Implement spending alerts and limits |
