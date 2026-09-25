# Service Guide: claw-health-service

## Overview

| Property    | Value            |
| ----------- | ---------------- |
| Port        | 4009             |
| Database    | None             |
| Env prefix  | N/A              |
| Nginx route | `/api/v1/health` |

The health service is a lightweight aggregator that checks the health of all other microservices. It has no database of its own. Its history lives in Prometheus (ADR-113), which it exports to and reads back for the status page.

## Architecture

This service is intentionally minimal. It makes HTTP GET requests to each service's `/api/v1/health` endpoint and aggregates the results into a single response. It also checks infrastructure dependencies (PostgreSQL, MongoDB, Redis, RabbitMQ, Ollama).

## Dependencies

Notably lighter than other services:

- `@nestjs/common`, `@nestjs/core`, `@nestjs/platform-express` -- NestJS framework
- `axios` -- HTTP client for health check requests
- `helmet` -- security headers
- `nestjs-pino`, `pino`, `pino-http`, `pino-pretty` -- structured logging
- `@nestjs/throttler` -- rate limiting
- `zod` -- response validation

- `@claw/shared-utilities` -- the SSRF-guarded HTTP client
- `@claw/shared-types` -- `ServiceStatus`, `UserRole`
- `@claw/shared-auth` -- `AuthGuard`, `SessionRevocationGuard`, `RolesGuard` on the status endpoint (2026-09-23)

No Prisma, no RabbitMQ. Redis only through `SessionRevocationGuard` (fails open).

## API Endpoints

| Method | Path                    | Auth                    | Description                                                |
| ------ | ----------------------- | ----------------------- | ---------------------------------------------------------- |
| GET    | `/api/v1/health`        | Public                  | Aggregated health status (service names, errors)           |
| GET    | `/api/v1/health/status` | Bearer, **ADMIN** only  | Status page: component state, uptime 24h/7d/30d, incidents |
| GET    | `/api/v1/metrics`       | Internal (not in nginx) | Prometheus exposition of the same fan-out                  |

## Response Format

```json
{
  "status": "healthy",
  "timestamp": "2026-04-11T10:00:00.000Z",
  "services": {
    "auth-service": {
      "status": "healthy",
      "responseTimeMs": 12,
      "url": "http://auth-service:4001"
    },
    "chat-service": {
      "status": "healthy",
      "responseTimeMs": 8,
      "url": "http://chat-service:4002"
    },
    "ollama": {
      "status": "healthy",
      "responseTimeMs": 45,
      "url": "http://ollama:11434"
    }
  },
  "infrastructure": {
    "rabbitmq": { "status": "healthy" },
    "redis": { "status": "healthy" }
  }
}
```

## Overall Status Logic

The aggregated `status` field follows these rules:

| Condition                        | Overall Status |
| -------------------------------- | -------------- |
| All services healthy             | healthy        |
| Some services down, core healthy | degraded       |
| Core services down (auth, chat)  | unhealthy      |
| Health service itself failing    | N/A (502)      |

## Service URLs

The health service is configured with URLs for all other services, typically via environment variables or service discovery in Docker Compose:

| Service           | Default URL                         |
| ----------------- | ----------------------------------- |
| auth-service      | http://auth-service:4001            |
| chat-service      | http://chat-service:4002            |
| connector-service | http://connector-service:4003       |
| routing-service   | http://routing-service:4004         |
| memory-service    | http://memory-service:4005          |
| file-service      | http://file-service:4006            |
| audit-service     | http://audit-service:4007           |
| ollama-service    | http://ollama-service:4008          |
| client-logs       | http://client-logs-service:4010     |
| server-logs       | http://server-logs-service:4011     |
| image-service     | http://image-service:4012           |
| file-gen-service  | http://file-generation-service:4013 |
| ollama runtime    | http://ollama:11434                 |

## Dependency rows (ClamAV)

Some dependencies are checked by the service that uses them and reported in its
`/health` body. `DEPENDENCY_PROBES` (`constants/health.constants.ts`) lifts them
into rows of their own in `checkAll()`:

| Row      | Source       | Body field        | Status component                           |
| -------- | ------------ | ----------------- | ------------------------------------------ |
| `clamav` | file-service | `services.clamav` | `antivirus` — "Antivirus scanner (ClamAV)" |

`up` → UP, `down` → DOWN (host-free `error`), anything else or the source down
→ no row (not measured). Each row gets a `claw_service_up` series and uptime
history like a service. clamd down makes the aggregate `degraded`.

## Timeout and Retry

- Each health check has a 5-second timeout
- Failed checks are marked as `DOWN` with the error message
- Response times are measured for performance monitoring
- No retries -- a single failure marks the service as unhealthy for that check cycle

## Use Cases

- **Dashboard widget** -- frontend polls this endpoint to show system status
- **Docker healthcheck** -- used as the health check command for the service container
- **Alerting** -- external monitoring tools can poll this endpoint
- **Load balancer** -- nginx can use this for upstream health checks

## Metrics for Prometheus (ADR-113, 2026-09-20)

`GET /api/v1/metrics` renders the same fan-out `/api/v1/health` answers, in the
Prometheus text format: `claw_service_up`, `claw_service_response_ms`,
`claw_services_total`, `claw_services_up`, `claw_health_snapshot_age_ms`.

- **It is cached** for `METRICS_SNAPSHOT_TTL_MS` (14 s, just under the 15 s
  scrape). Without that, every scrape would fan out to all 17 services —
  ~98,000 extra requests a day — and two scrapers at once would double it.
  Concurrent scrapes share a single refresh.
- **Only allowlisted labels** may be rendered (`service`). The renderer throws
  otherwise: metrics live 30 days and are widely readable (rules/19 §8).
- **The route is internal.** nginx proxies `/api/v1/health` and not this one.
- `checkAll` logs at INFO only when the aggregate status _changes_ (rules/19
  §9); the healthcheck and the scraper together used to write ~11,500
  identical lines a day.

How to look at it: [metrics-and-dashboards](../08-runtime-devops/metrics-and-dashboards.md).

## Status page (observability plan B3, 2026-09-23)

`GET /api/v1/health/status` feeds the service-status section of
`/observability` ([observability-page](../05-frontend/observability-page.md)).
Admin-only, like the page (plan §2). nginx's existing `location /api/v1/health`
prefix already routes it; `tools/__tests__/status-page-route.test.mjs` pins
that no more specific location steals it.

```
StatusPageController (AuthGuard + SessionRevocationGuard + RolesGuard(ADMIN), throttle 120/min,
│                     Cache-Control: private, max-age=30)
└── StatusPageService
    ├── HealthSnapshotService.current()   live state — the SAME 14 s snapshot the exporter uses
    └── StatusHistoryManager.read()       history, cached 60 s (a failure cached 30 s)
        └── PrometheusAdapter.queryRange()  one attempt, 5 s timeout, zod-validated, no retry
            ├── count(claw_service_up)                          buckets that were measured
            └── min_over_time(claw_service_up[300s]) == 0       buckets each service failed in
```

- **Components, not services.** `COMPONENT_MEMBERS` groups the 17 services into
  10 user-facing components. The response carries component keys, states,
  integers and ISO timestamps only — no service name, host, port, version or
  error message. `status-aggregation.utility.spec.ts` serialises it and
  asserts that; a failed Prometheus read is logged, never returned.
- **Integer math.** Uptime is `floor(upBuckets × 10000 / measuredBuckets)` basis
  points, rounded down so 99.99…% never shows as 100%. Unmeasured buckets are
  left out of both sides and reported as `coverageBasisPoints`.
- **Conservative by design.** 5-minute buckets; a bucket counts against a
  component if any check in it failed. Degraded = some members failed, Down =
  all did.
- **Bounded.** Two range queries over 30 d at a 300 s step = 8,640 points per
  series (Prometheus's limit is 11,000). At most 50 incidents, last 7 days.
  90-day uptime does not exist: retention is 30 days.
- **No new store, no migration.** Health history is a Prometheus series
  (plan §2); this service only reads it.
- `PROMETHEUS_BASE_URL` is a constant (`http://prometheus:9090`), like
  `SERVICE_URLS`, declared to the SSRF guard with `declaredHost`.

Degraded and don't know why: [runbook-status-page-degraded](../11-runbooks/runbook-status-page-degraded.md).
