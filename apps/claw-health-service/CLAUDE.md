# Claw Health Service - Development Rules

## Service Overview

This is a lightweight, stateless aggregator service that calls all other services' /health endpoints and returns an aggregated health status.

## Tech Details

- **Port**: 4009
- **Database**: NONE. History lives in Prometheus, which this service exports to and reads back (ADR-113)
- **Dependencies**: Minimal (NestJS, axios, nestjs-pino, zod, `@claw/shared-utilities`, `@claw/shared-types`, `@claw/shared-auth`)

## Behavior

- Calls every other service's health endpoint (`SERVICE_URLS`) in parallel; `plugin-service` (port 4021) joined the platform group in the plugins foundation batch
- Returns aggregated status: healthy (all up), degraded (some down), unhealthy (all down)
- Individual service failures do not crash this service — they are reported as degraded

## Baseline rules

Baseline rules for every backend service (commands, absolute rules, declarations, library wrapping, Docker rebuild, workflow phases, checklists, output format): [docs/04-backend/backend-service-baseline.md](../../docs/04-backend/backend-service-baseline.md). This file adds only what is specific to `claw-health-service`.

## The Prometheus exporter (ADR-113)

- `GET /api/v1/metrics` is the health fan-out rendered as metrics. It adds no
  new polling: the snapshot is cached just under the scrape interval.
- A metric may carry only the labels in `ALLOWED_METRIC_LABELS`; the renderer
  throws on anything else, because metrics outlive and out-read log lines.
- `checkAll` logs INFO only on a status change. Do not put it back to logging
  every tick: the healthcheck and the scraper run every 15 s each.
- Prometheus scrapes this service over HTTPS with the stack CA and is never
  published. Its config is bind-mounted, so a change is a RECREATE.

## The status page (observability plan B3)

- `GET /api/v1/health/status` is **admin-only** (`AuthGuard` +
  `SessionRevocationGuard` + `RolesGuard`, `@Roles(UserRole.ADMIN)`), throttled
  at 120/min, `Cache-Control: private, max-age=30`. The public `/api/v1/health`
  is unchanged.
- **It speaks components, never services.** `COMPONENT_MEMBERS` maps the
  services (plus the `clamav` and scraper-sidecar dependency rows) to 14 coarse groups. Nothing in `StatusPageResponse` may carry a
  service name, host, port, version or error text; the redaction spec in
  `status-aggregation.utility.spec.ts` enforces it. Log a failure, never
  return it.
- **Never fan out on a request.** Live state is `HealthSnapshotService.current()`,
  the same 14 s snapshot the exporter serves. Do not call `checkAll()` from a
  request path.
- **History is read from Prometheus**: two range queries, cached 60 s; a failed
  read is cached 30 s. One attempt, 5 s timeout, no retry loop.
- **Integer basis points** for uptime, floored. Unmeasured buckets count on
  neither side.
- A new service in `SERVICE_URLS` (or a new `DEPENDENCY_PROBES` row) must join
  exactly one group in `COMPONENT_MEMBERS` (a spec fails otherwise). A new component needs the
  frontend enum, label key and 13 locales: `skills/watch-production-health.md`.

## Dependency rows: ClamAV via file-service (2026-09-25)

`DEPENDENCY_PROBES` turns a dependency another service checks itself into a
row of its own, read from that service's `/health` body with no extra request:
`clamav` ← file-service `services.clamav` (a real clamd `zPING` → `PONG`).

- The row feeds everything a service row does: `claw_service_up{service="clamav"}`,
  uptime history, and the **Antivirus scanner (ClamAV)** status component
  (`StatusComponent.ANTIVIRUS`).
- It is UP/DOWN only when the source said so. `disabled`, a missing key (older
  file-service) or file-service itself down = no row = "not measured", never an
  outage. Its `error` is a fixed, host-free string (`DEPENDENCY_DOWN_ERROR`).
- health-service never opens a socket to clamd; file-service owns that check.
- Runbook: [`runbook-clamav-unreachable.md`](../../docs/11-runbooks/runbook-clamav-unreachable.md).

## Dependency rows: scraper sidecars via research-service (2026-09-25)

- `crawl4ai` / `flaresolverr` / `firecrawl` ← research-service
  `services.<key>` (it probes each ENABLED sidecar; ADR-121 addendum). Status
  components `web-scraper-*`, "Web scraper: Crawl4AI / FlareSolverr / Firecrawl".
- `disabled` → `AggregatedHealth.disabledDependencies` → `ComponentState.DISABLED`
  on the status page (no uptime shown, ignored by `overallState`). Never DOWN.
- A down sidecar is a DOWN row + `claw_service_up{service="crawl4ai"} 0`;
  research-service itself stays UP (`degraded`, HTTP 200).
- Runbook: [`runbook-scraper-sidecar-down.md`](../../docs/11-runbooks/runbook-scraper-sidecar-down.md).
