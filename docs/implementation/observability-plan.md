# O3 — Operational observability: plan

**Status**: planned, 2026-09-20. Revised after the CTO and ops reviews.
**Audit it came from**: this session's survey of the existing surface (§1).

## 1. What exists (audited, not assumed)

| Piece                                                      | State       | Where                                                                                                                                                                          |
| ---------------------------------------------------------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Every container's logs in one store                        | **DONE**    | Vector `infra/vector/vector.yaml` → `server-logs-service` (Mongo `server_logs`, 30-day TTL). [ADR-101](../13-adr/adr-101-every-container-log-in-one-store.md)                  |
| Reading prod logs without SSH                              | **DONE**    | `GET /api/v1/ops/logs` behind `OpsTokenGuard`. [ADR-102](../13-adr/adr-102-read-only-ops-tokens.md) · [`skills/read-production-logs.md`](../../skills/read-production-logs.md) |
| Browser telemetry                                          | **DONE**    | `client-logs-service`, ADR-089                                                                                                                                                 |
| Business and security events, per-call cost/latency ledger | **DONE**    | `audit-service` (`audit_logs`, `usage_ledger`)                                                                                                                                 |
| `/observability` page                                      | **PARTIAL** | LLM usage only: requests, cost, latency p50/p95, failures                                                                                                                      |
| `/logs`, `/audits` pages                                   | **DONE**    | admin-gated browsers                                                                                                                                                           |
| Service health                                             | **PARTIAL** | `health-service` fans out to 17 services on request. No history, no page, no alerting                                                                                          |
| Metrics                                                    | **MISSING** | no `prom-client`, no `/metrics`, no store                                                                                                                                      |
| Alerting                                                   | **MISSING** | —                                                                                                                                                                              |

`docs/LOGGING_OBSERVABILITY_ARCHITECTURE.md` says the same: the platform is
**forensic**, not **operational**.

## 2. Owner decisions (2026-09-20)

| Question                              | Answer                                                                                                                                                               |
| ------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Where metrics live                    | **Prometheus + Grafana**, two more containers on the prod box                                                                                                        |
| Who may see operational data          | **Admin only**                                                                                                                                                       |
| When something breaks                 | **In-app only** — a status banner and an incident list. No email, no webhook                                                                                         |
| First deliverable                     | **Service health over time + a status page**                                                                                                                         |
| Protecting Grafana                    | **Behind the admin session** — no shared password                                                                                                                    |
| How the browser proves it is an admin | **A short-lived, httpOnly cookie scoped to `/grafana`**, minted by auth-service when an admin opens Grafana, checked by nginx `auth_request`, dying with the session |
| Creating the containers in production | **Teach `deploy-prod.sh`** to handle image-only containers, and make their config files trigger a recreate                                                           |
| Metrics retention                     | **30 days**, the same as logs                                                                                                                                        |

Consequences that follow, not separate choices:

- Health history is a Prometheus series, not a second Mongo collection.
- Prometheus is **never published**; only Grafana is reachable, and only
  through nginx behind the cookie.

## 3. Findings that changed this plan

From the CTO and ops reviews, each verified in the repo before acceptance:

1. **`deploy-prod.sh` dropped image-only services** — `compute_plan` and
   `finalize_plan` both skipped a service with no `dockerfile:`, so a container
   with no `build:` was never created or recreated by the Deploy production
   workflow, and `log-shipper`'s config changes deployed nothing at all.
   **Fixed in B0, 2026-09-20.**
2. **`infra/prometheus/**` and `infra/grafana/**` still deploy nothing**, because
   those services do not exist yet. B1 adds their rows to `CONFIG_DIR_SERVICES`
   when it adds the containers.
3. **A bind-mounted config file needs a recreate, not a restart** — the same
   trap as nginx (`memory/project_nginx_stale_bind_mount.md`).
4. **nginx must proxy through a variable + resolver**
   (`proxy_pass $grafana_backend`), as every entry in
   `infra/nginx/locations.conf` does. A literal upstream name makes nginx fail
   to start, which takes the whole site down.
5. **Grafana's own login was a second authentication system** with no
   attribution, revocation or audit trail. Replaced by the cookie above.
6. **health-service will both export metrics and read them back.** Accepted,
   and recorded as a consequence in the ADR.
7. **The exporter is not free.** `HealthService.checkAll`
   (`apps/claw-health-service/src/modules/health/services/health.service.ts:16`)
   fans out to all 17 services on every call and logs an INFO line each time;
   nothing caches. Scraped every 15 s that is ~98,000 outbound checks and
   5,760 log lines a day, all landing in Mongo under the same 30-day TTL. The
   plan's earlier claim of "no new polling" was wrong. B1 therefore caches the
   snapshot and logs the metrics path at debug, which Vector already drops.
8. **Disk is a non-issue, and the plan should say so:** 45 series at a 15 s
   scrape for 30 days is ~8 M samples, well under 1 GB including index and WAL
   — Prometheus's own self-scrape dominates it.
9. **30 days now exists in three places**: ADR-101's prose, the Mongo TTL
   literal (`server-log.schema.ts`, `expires: 2_592_000`) and
   `prometheus.yml`. A test ties them together rather than a fourth copy.

## 4. Batches

### B0 — The deploy script learns image-only containers

Independent of everything else, and with a blast radius of **all 17 deployed
services**, so it is gated on its own.

- **Code**: `scripts/deploy-prod.sh` — plan, create and recreate services that
  have no `build:`, through a `CONFIG_DIR_SERVICES` table mapping a container's
  config directory to its service name.
- **Tests**: `tools/__tests__/deploy-prod-e2e.sh` — a rehearsal case that
  deploys a config-only change to an image-only container and asserts it is
  recreated and never built. `tools/__tests__/deploy-prod.test.mjs` needed no
  change: it drives the rehearsal. **Deviation from the first draft**: the
  `infra/prometheus/**` and `infra/grafana/**` triggers moved to B1, because
  those services do not exist until B1 declares them.
- **Verified by**: the rehearsal, which runs the real script against a stubbed
  docker. Whether a real production deploy creates the containers **cannot be
  verified here** — prod has not been deployed since 2026-09-17 and no deploy
  is approved. That is reported as not run.

### B1 — The metrics spine

Prometheus scrapes; health-service exports what its fan-out already knows; the
deploy script learns to carry a container that has no build step.

- **Code**: `apps/claw-health-service/src/modules/health/` — `GET /metrics` in
  Prometheus text format: `claw_service_up{service}`,
  `claw_service_response_ms{service}`, `claw_scrape_duration_ms`. No new
  polling: it reuses the existing fan-out.
- **Infra**: `infra/prometheus/prometheus.yml` (15 s scrape, 30 d retention);
  `prometheus` in `docker/docker-compose.{dev,prod}.services.yml`, internal
  only, on the same pattern as `log-shipper`.
- **Cost control**: the exporter serves a cached snapshot
  (`METRICS_SNAPSHOT_TTL_MS`, ≥ the scrape interval) and logs at debug, so a
  15 s scrape does not multiply the fan-out or flood the log store.
- **Redaction**: a metric carries only the labels in a named allowlist — never
  a user id, never a secret (rules/19, with a test).
- **Verified by**: exporter answered with `curl`; every Prometheus target
  `up`; a stopped service visible as down within one scrape; the fan-out rate
  measured against the cache.

### B2 — Grafana behind the admin session

- **Code**: auth-service mints a short-lived cookie for an admin
  (`POST /auth/grafana-access`), scoped to `/grafana`, httpOnly, Secure,
  SameSite=Lax, bound to the session so the revocation shipped today applies.
  A verify endpoint answers nginx `auth_request` 200/401.
- **Infra**: `grafana` container (provisioned datasource + one dashboard),
  nginx `/grafana/` behind `auth_request`, variable `proxy_pass`.
- **Frontend**: an "Open Grafana" entry on `/observability`, admin-only.
- **Verified by**: signed-out browser → 401; non-admin → 401; admin → the
  dashboard; after sign-out the cookie no longer opens it.

### B3 — The status page

- `/observability` gains a Services section: what is up now, what went down
  and when, for how long, over 24 h and 7 d, read through health-service
  (the browser never talks to Prometheus).
- i18n in all 13 locales; admin-only, as the page already is.
- **Verified by**: the browser lane — stop a service, watch it turn red,
  restart it, watch the incident close; three widths plus RTL.

### B4 — Not in this pass

Per-service request metrics (`prom-client` in every service's pipeline) and the
in-app incident list. Recorded as a debt item so the deferral is visible.

## 5. Knowledge delta, by path

**B1**

```
Code:     apps/claw-health-service/src/modules/health/controllers/metrics.controller.ts
          apps/claw-health-service/src/modules/health/services/metrics.service.ts
          apps/claw-health-service/src/modules/health/utilities/prometheus-text.utility.ts
          apps/claw-health-service/src/modules/health/constants/metrics.constants.ts
Infra:    infra/prometheus/prometheus.yml
          docker/docker-compose.dev.services.yml, docker/docker-compose.prod.services.yml
          scripts/deploy-prod.sh
Docs:     docs/08-runtime-devops/metrics-and-dashboards.md (new)
          docs/LOGGING_OBSERVABILITY_ARCHITECTURE.md (the gap this closes)
          docs/04-backend/service-guide-health.md
          docs/11-runbooks/runbook-metrics-stack.md (new)
          apps/claw-health-service/CLAUDE.md
          docs/06-data/environment-variables.md, context/environment-ownership-map.md (only if a var is added)
ADR:      docs/13-adr/adr-113-prometheus-for-operational-metrics.md + docs/13-adr/adr-index.md
Rules:    rules/19-logging-observability-and-redaction.md (a metric carries no user id and no secret)
Skills:   skills/watch-production-health.md (new) + skills/00-index.md
Context:  context/port-and-service-map.md, context/architecture-map.md
Memory:   memory/project_observability.md (+ MEMORY.md)
Debt:     docs/14-risk-debt/technical-debt.md + technical-debt-register.md
          (B4 deferral; TSDB has no backup)
Tests:    tools/__tests__/observability-stack.test.mjs (both containers in every compose file;
          Prometheus never published; config paths are deploy triggers)
          tools/__tests__/deploy-prod.test.mjs + deploy-prod-e2e.sh (image-only container)
          health-service unit tests for the exporter
Why no X: no Prisma migration (no relational data); no i18n (nothing user-facing in B1);
          no shared package (nothing crosses a service boundary); no CI matrix change
          (no new workspace)
```

**B2**

```
Code:     apps/claw-auth-service/src/modules/auth/controllers/grafana-access.controller.ts
          + service, constants, DTO; apps/claw-frontend/src/... ("Open Grafana")
Infra:    infra/grafana/provisioning/{datasources,dashboards}/*
          docker/docker-compose.{dev,prod}.services.yml, infra/nginx/locations.conf
          .env.example, .env, scripts/install.sh, scripts/install.ps1
          docs/06-data/environment-variables.md, context/environment-ownership-map.md
Docs:     docs/04-backend/service-guide-auth.md, docs/08-runtime-devops/metrics-and-dashboards.md
ADR:      adr-113 (the cookie is part of the same decision)
Rules:    rules/16-authentication-and-authorization.md (the cookie's constraints)
i18n:     all 13 locales + src/types/i18n.types.ts (the "Open Grafana" entry)
Tests:    auth-service controller/service tests; nginx route test if one exists
Why no X: no migration (the cookie is signed, not stored); no new skill
          (the runbook from B1 covers it)
```

**B3**

```
Code:     apps/claw-health-service/.../controllers/health-history.controller.ts
          apps/claw-frontend/src/app/(portal)/observability/*, hooks/observability/*,
          components/observability/*, types/, constants/
i18n:     all 13 locales + src/types/i18n.types.ts
Docs:     docs/05-frontend/observability-page.md (new), docs/product/observability.md
Skills:   skills/watch-production-health.md (extended with the page)
Tests:    frontend component + hook tests; health-service controller tests
Why no X: no ADR (B1 decided it); no new rule; no migration
```

## 6. Order and gate

- **B1 first.** Nothing can read what does not exist.
- **B2 and B3 are unordered** with respect to each other once B1 lands.
- Inside B1: the exporter and the compose entries are parallel-safe; the
  `deploy-prod.sh` change must land with them, not after.
- **B0 is unordered** with respect to B1: nothing consumes it until a
  production deploy, which is not approved.
- **One scoped gate per batch, at its end:**
  - B0: `node --test tools/__tests__/deploy-prod.test.mjs` plus the rehearsal
    script, and root `npm run knowledge:test`.
  - B1: `apps/claw-health-service` (typecheck, lint, test, build) + root
    `npm run knowledge:test`, then the stack up and scraped.
  - B2: `apps/claw-auth-service` + `apps/claw-frontend`, then the browser lane.
  - B3: `apps/claw-health-service` + `apps/claw-frontend`, then the browser lane.

## 7. Operational procedure (the runbook this work owes)

`docs/11-runbooks/runbook-metrics-stack.md` must answer, with commands:

- **Preconditions**: `df -h` and `free -m` on the box before the TSDB volume
  exists.
- **First create**: how the containers come up the first time, and that it must
  not race a deploy (the deploy holds a flock).
- **Config change**: `prometheus.yml` is a single bind-mounted file —
  **recreate**, never restart. `claw.sh service:rebuild prometheus` does not
  apply: there is no build context.
- **Rollback**: remove both containers, revert `locations.conf`, recreate
  nginx. The site must be reachable at every step.
- **The one irreversible act**: deleting the `prometheus-data` volume. It is
  never done automatically.

## 8. Assumptions

| Assumption                                                                                                                                                                              | What would invalidate it                                                                        |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| The prod box has room for two containers plus a 30-day TSDB. Computed: 45 series × 15 s × 30 d ≈ 8 M samples, **under 1 GB** with index and WAL; Prometheus's own self-scrape dominates | `df -h`/`free -m` on the box say otherwise; retention shrinks, or Grafana is dropped            |
| 15 s scrape is enough resolution                                                                                                                                                        | An incident is missed between scrapes; the interval drops to 5 s, which quadruples nothing else |
| The fan-out is a sufficient health signal                                                                                                                                               | Per-route metrics are wanted, which is B4                                                       |
| A cookie scoped to `/grafana` is acceptable for an admin-only surface                                                                                                                   | The owner wants no browser credential at all; then Grafana goes and B3 stands alone             |

## 9. What cannot be proven here

Production has not been deployed since 2026-09-17 and no deploy is approved,
so these are reported as **not run** rather than claimed:

- A real Deploy-production run creating an image-only container.
- The bind-mounted `prometheus.yml` needing a recreate rather than a restart
  (the trap in `memory/project_nginx_stale_bind_mount.md`).
- 30 days of retention actually elapsing, and the 7-day panel with real data.
- The `df -h` / `free -m` preconditions on the production box.

## 10. Open questions

_None outstanding. Every question was answered on 2026-09-20 and recorded in §2._
