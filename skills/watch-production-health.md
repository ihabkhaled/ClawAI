# Skill: Watch production health

**When**: you need to know whether the platform is up, what went down and for
how long, or you are about to change anything that feeds the service-status
section on `/observability`.

**Governing**: [ADR-113](../docs/13-adr/adr-113-prometheus-for-operational-metrics.md) ·
[observability plan](../docs/implementation/observability-plan.md) B1/B3 ·
[rules/19](../rules/19-logging-observability-and-redaction.md) (no identity or
infrastructure detail in what users read).

## The pipeline, in one line

health-service checks 17 services → caches one snapshot (14 s) → exports
`claw_service_up{service}` → Prometheus scrapes every 15 s, keeps 30 d →
health-service reads it back with two range queries → `GET /api/v1/health/status`
(admin) → `/observability` service-status section.

## Look at it

1. **Browser**: sign in as an admin, open `/observability`. The first card is
   the service status: ten components, state in words, uptime 24 h / 7 d / 30 d,
   incidents in the last 7 days.
2. **API**:
   ```bash
   curl -sk -H "Authorization: Bearer $ADMIN_TOKEN" \
     https://claw.local/api/v1/health/status | jq '.overall, [.components[] | {component, state}]'
   ```
3. **Raw, with service names** (host only): see
   [metrics-and-dashboards.md](../docs/08-runtime-devops/metrics-and-dashboards.md).

## Change it safely

| You are changing                    | Do this                                                                                                                                                                                                       |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Adding a service to `SERVICE_URLS`  | Add it to exactly one group in `COMPONENT_MEMBERS` — `status-aggregation.utility.spec.ts` fails otherwise                                                                                                     |
| Adding a component                  | Enum value in health-service AND `apps/claw-frontend/src/enums/status-component.enum.ts`, label key in `service-status.constants.ts`, `observability.status.components.*` in all 13 locales + `i18n.types.ts` |
| Adding a field to the response      | It must not be able to carry a host, port, service name, version or error text. Extend the redaction spec first                                                                                               |
| Bucket size / windows               | `status-page.constants.ts`. 30 d × bucket must stay under Prometheus's 11,000 points per series                                                                                                               |
| Anything that fans out on a request | Don't. Read `HealthSnapshotService.current()`; never call `checkAll()` from a request path                                                                                                                    |

## Verify a change (the B3 browser lane)

1. Stack up (`./scripts/claw.sh up`), sign in as admin, open `/observability`.
2. `./scripts/claw.sh stop payment-service`. Within one scrape plus the page's
   60 s poll, Payments reads **Down** and an incident appears **Ongoing**.
3. `./scripts/claw.sh start payment-service`. The state returns to
   **Operational** and the incident closes with a duration.
4. Screenshot at 320, 375, 768 and 1440 px, and once in Arabic (RTL).
5. As a non-admin, `/api/v1/health/status` returns 403; signed out, 401.

When something reads Degraded and you do not know why:
[runbook-status-page-degraded.md](../docs/11-runbooks/runbook-status-page-degraded.md).
