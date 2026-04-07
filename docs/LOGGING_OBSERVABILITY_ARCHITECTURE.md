# Logging and Observability Architecture Audit

## Overview

Claw has three dedicated observability services plus structured logging across all backend services:
- **client-logs-service** (port 4010) — frontend log ingestion, MongoDB, TTL 30 days
- **server-logs-service** (port 4011) — backend log aggregation, RabbitMQ-driven, Elasticsearch-ready schema
- **audit-service** (port 4007) — business event audit trail + usage ledger, MongoDB

---

## Architecture Diagram

```
┌─────────────┐        ┌──────────────────┐        ┌───────────────────┐
│  Frontend   │──POST──▶  client-logs-svc  │──────▶│    MongoDB        │
│  (batched)  │        │  (port 4010)      │       │  (TTL 30 days)    │
└─────────────┘        └──────────────────┘        └───────────────────┘

┌─────────────┐        ┌──────────────────┐        ┌───────────────────┐
│  All Backend│──Rabbit─▶  server-logs-svc │──────▶│    MongoDB        │
│  Services   │  MQ    │  (port 4011)      │       │  (ES-ready schema)│
└─────────────┘        └──────────────────┘        └───────────────────┘

┌─────────────┐        ┌──────────────────┐        ┌───────────────────┐
│  All Backend│──Rabbit─▶  audit-service   │──────▶│    MongoDB        │
│  Services   │  MQ    │  (port 4007)      │       │  audit_logs +     │
└─────────────┘        └──────────────────┘        │  usage_ledger     │
                                                    └───────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│  Every Service: LoggingInterceptor + pino logger with redaction     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Client Logs Service

- Accepts batched log entries from the frontend via HTTP POST
- Stores in MongoDB with TTL index (30-day retention)
- Redaction applied before storage — sensitive fields stripped
- Schema: level, message, timestamp, userId, sessionId, metadata

## Server Logs Service

- Subscribes to log events via RabbitMQ
- Elasticsearch-ready schema (structured JSON, indexed fields)
- Batch constants defined for processing efficiency
- Log levels: ERROR, WARN, INFO, DEBUG (enum-based)
- Each log entry includes: service name, level, message, timestamp, metadata

## Audit Service

### Audit Log Schema
```typescript
{
  userId: string;        // Who performed the action
  action: string;        // What happened (LOGIN, LOGOUT, CREATE, UPDATE, DELETE, etc.)
  entityType?: string;   // What type of entity (user, connector, message, memory)
  entityId?: string;     // Which specific entity
  severity: string;      // LOW | MEDIUM | HIGH
  details?: Record<string, unknown>;  // Action-specific payload
  ipAddress?: string;    // Client IP (for auth events)
  createdAt: Date;       // Timestamp
}
```

### Usage Ledger Schema
```typescript
{
  userId: string;        // Who consumed the resource
  resourceType: string;  // What resource (llm_tokens)
  action: string;        // What triggered it (message.completed)
  quantity: number;       // How much (total tokens)
  unit?: string;         // Unit of measure (tokens)
  metadata?: Record<string, unknown>;  // Provider, model, latency
  createdAt: Date;
}
```

---

## Event Catalog — 10 Audited Event Types

| # | Event Pattern | Action Logged | Severity | Usage Tracked |
|---|---|---|---|---|
| 1 | `user.login` | LOGIN | LOW | No |
| 2 | `user.logout` | LOGOUT | LOW | No |
| 3 | `connector.created` | CREATE | MEDIUM | No |
| 4 | `connector.updated` | UPDATE | MEDIUM | No |
| 5 | `connector.deleted` | DELETE | HIGH | No |
| 6 | `connector.synced` | CONNECTOR_SYNC | LOW | No |
| 7 | `connector.health_checked` | ACCESS | LOW/HIGH (based on status) | No |
| 8 | `routing.decision_made` | ROUTING_DECISION | LOW | No |
| 9 | `message.completed` | ACCESS | LOW | YES — llm_tokens usage |
| 10 | `memory.extracted` | CREATE | LOW | No |

---

## Structured Logging Across All Services

### LoggingInterceptor
- Present in every service (`src/app/interceptors/logging.interceptor.ts`)
- Logs request method, URL, response status, duration for every HTTP request
- Applied globally via NestJS APP_INTERCEPTOR

### Pino Logger
- Used in server-logs-service and potentially other services
- Redaction paths configured to strip sensitive data (passwords, tokens, API keys)
- Structured JSON output compatible with log aggregation tools

### Helmet Security Headers
- Applied in every service's `main.ts`
- Not directly observability, but relevant to security logging

---

## What Is REAL

1. **Comprehensive structured logging** — every service has LoggingInterceptor logging all HTTP requests with method, URL, status, duration
2. **Audit events for all critical actions** — 10 event types covering auth, connectors, routing, messages, and memory
3. **Usage ledger** — token consumption tracked per message completion with provider/model metadata
4. **Client log batching** — frontend logs sent in batches, not per-event, reducing network overhead
5. **Log redaction** — pino configured with redaction paths to strip sensitive fields
6. **MongoDB TTL** — client logs expire after 30 days automatically
7. **Elasticsearch-ready schema** — server logs structured for future ES integration
8. **Severity classification** — audit events categorized by impact level (LOW/MEDIUM/HIGH)
9. **RabbitMQ-driven log aggregation** — server logs decoupled from service runtime via async messaging
10. **Separate audit + usage concerns** — usage ledger is distinct from audit trail

## What Is MISSING

1. **No distributed tracing** — no OpenTelemetry, no trace IDs propagated across services
2. **No request correlation from frontend** — no correlation ID linking frontend log to backend request chain
3. **No alerting** — no threshold-based alerts (e.g., error rate spike, service down)
4. **No log rotation config** — server logs in MongoDB grow unbounded (client logs have TTL, server logs do not)
5. **No dashboard/visualization** — no Grafana, no Kibana, logs must be queried manually
6. **No metrics collection** — no Prometheus, no service-level metrics (request rate, latency percentiles)
7. **No health check history** — connector health events logged but no trend tracking
8. **No log level runtime control** — cannot change log verbosity without redeployment
9. **No error aggregation** — no Sentry or equivalent for error grouping and deduplication
10. **No audit log tamper protection** — MongoDB documents can be modified/deleted by anyone with DB access

---

## Signs Logging Is Noisy but Useless — Checklist

| # | Check | Status | Notes |
|---|---|---|---|
| 1 | Can you trace a user request from frontend to final AI response? | NO | No correlation IDs across services |
| 2 | Can you find all logs related to a specific conversation? | PARTIAL | threadId in audit events, but no unified query |
| 3 | Do logs tell you WHY something failed, not just THAT it failed? | PARTIAL | Error messages logged, but no stack traces in audit |
| 4 | Can you reconstruct the routing decision for any message? | YES | `routing.decision_made` event captures full decision context |
| 5 | Can you calculate cost per user? | YES | Usage ledger tracks tokens per message with model info |
| 6 | Are logs queryable without SSH-ing into the server? | NO | No log viewer UI, no dashboard |
| 7 | Can you detect a service going down in real-time? | NO | No alerting, health checks are periodic |
| 8 | Do client logs help debug frontend issues? | PARTIAL | Batched with metadata, but no source maps or stack traces |
| 9 | Can you audit who changed what and when? | YES | Audit log captures user, action, entity, timestamp |
| 10 | Is the logging infrastructure itself monitored? | NO | No monitoring of MongoDB/RabbitMQ health for log services |

### Verdict
Logging is **comprehensive in coverage but operationally disconnected**. Every service logs, audit events are tracked, usage is metered. But without distributed tracing, correlation IDs, or alerting, the logs are forensic (good for post-incident investigation) rather than operational (good for real-time debugging and monitoring).

---

## Recommended Improvements (Priority Order)

1. **Add correlation IDs** — generate at frontend, propagate via headers through all services
2. **Add OpenTelemetry** — distributed tracing across the 9-service mesh
3. **Add alerting** — error rate thresholds, service health degradation
4. **Add server log TTL** — match client logs' 30-day retention
5. **Add log viewer UI** — admin page for querying logs without DB access
6. **Add Prometheus metrics** — request rate, latency, error rate per service
7. **Add error aggregation** — group and deduplicate errors for actionable insights
