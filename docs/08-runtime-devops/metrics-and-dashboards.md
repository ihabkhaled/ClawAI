# Metrics: what is collected, and how to look at it

Decision and rationale: [ADR-113](../13-adr/adr-113-prometheus-for-operational-metrics.md).
Logs are a different pipeline: [ADR-101](../13-adr/adr-101-every-container-log-in-one-store.md)
and [log-aggregation-setup](log-aggregation-setup.md).

## The shape of it

```
health-service  ──checks 17 services──►  /api/v1/metrics  ◄──scrape every 15s──  prometheus
      ▲                                    (cached 14 s)                          (30-day TSDB,
      └── the same fan-out /api/v1/health answers                                  internal only)
```

- **Prometheus is not reachable from outside.** No published port, no nginx
  route. It has no login of its own, and it holds the platform's operational
  history.
- **The exporter measures nothing extra.** It renders the health fan-out that
  already exists, from a snapshot cached just under the scrape interval, so
  scraping cannot turn one request into 17 outbound calls every 15 seconds.

## What is collected

| Metric                        | Type  | Labels    | Meaning                                                                                                                                           |
| ----------------------------- | ----- | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `claw_service_up`             | gauge | `service` | 1 when the service answered its health check, 0 when it did not. Also `service="clamav"`: clamd as reported by file-service (`DEPENDENCY_PROBES`) |
| `claw_service_response_ms`    | gauge | `service` | How long that answer took. Absent while a service is down                                                                                         |
| `claw_services_total`         | gauge | —         | How many services are checked (17)                                                                                                                |
| `claw_services_up`            | gauge | —         | How many answered                                                                                                                                 |
| `claw_health_snapshot_age_ms` | gauge | —         | Age of the snapshot this scrape was served from. Near the scrape interval is normal; growing means the exporter is not refreshing                 |

**A metric carries `service` and nothing else.** The renderer throws on any
other label: metrics live for a month and are read by anyone with the
dashboard, so no user id, email, thread id or token may reach them
([rules/19](../../rules/19-logging-observability-and-redaction.md)).

## Looking at it

From the host, without exposing anything:

```bash
# What the exporter currently says
docker exec claw-health-service sh -c \
  'wget --no-check-certificate -qO- https://localhost:4009/api/v1/metrics'

# Is Prometheus actually scraping it?
docker exec claw-prometheus sh -c \
  'wget -qO- "http://localhost:9090/api/v1/targets?state=active"'

# How many services are up right now
docker exec claw-prometheus sh -c \
  'wget -qO- "http://localhost:9090/api/v1/query?query=claw_services_up"'

# Which one is down
docker exec claw-prometheus sh -c \
  'wget -qO- "http://localhost:9090/api/v1/query?query=claw_service_up==0"'
```

## Looking at it in Grafana

Grafana is served at `/grafana/` on the app's own host, behind the admin
session — no second login, no Grafana password anywhere
([ADR-115](../13-adr/adr-115-grafana-behind-the-admin-session.md)). An admin
opens it from the "Open Grafana" button on `/observability`, which mints a
15-minute cookie (`POST /api/v1/auth/grafana-access`) before opening the tab.
The cookie dies with the session: signing out, or an admin revoking the
session, closes Grafana on its next request.

nginx asks auth-service on every request (`auth_request`), and always
overwrites the identity header Grafana trusts — a browser cannot set it
itself. Grafana is never published; the cookie is the only way in.

Dashboards and the datasource are code, not UI state:

- `infra/grafana/provisioning/datasources/prometheus.yml` — the one
  datasource, the platform's own Prometheus, over the internal network.
- `infra/grafana/provisioning/dashboards/claw.yml` +
  `infra/grafana/dashboards/*.json` — every file here loads into the "ClawAI"
  folder and cannot be edited from the UI. See
  [`skills/add-a-grafana-dashboard.md`](../../skills/add-a-grafana-dashboard.md).
- `infra/grafana/grafana.ini` — bind-mounted; a change needs a **recreate**,
  the same trap as `prometheus.yml` and nginx's config.

The in-app status page is a separate batch (B3); see
[observability-plan](../implementation/observability-plan.md).

## Reading it back: the status page (B3)

health-service reads these series back for the admin-only service-status
section of `/observability` (`GET /api/v1/health/status`): two range queries
over 30 days at a 5-minute step, cached for a minute, turned into per-component
uptime and incidents. The browser never talks to Prometheus. Details:
[service-guide-health](../04-backend/service-guide-health.md) § Status page ·
[runbook-status-page-degraded](../11-runbooks/runbook-status-page-degraded.md).

## Changing the configuration

`infra/prometheus/prometheus.yml` is **bind-mounted as a single file**, so a
restart keeps the old inode and silently serves the old config — the same trap
nginx has ([runbook-nginx-stale-config](../11-runbooks/runbook-nginx-stale-config.md)).

- In production, `scripts/deploy-prod.sh` handles it: `infra/prometheus` is
  mapped to the `prometheus` container in `CONFIG_DIR_SERVICES`, and the
  container is force-recreated.
- Locally: `./scripts/claw.sh service:recreate prometheus`.
  `service:rebuild` does **not** apply — there is no build context; it is a
  published image.

## Retention, and what it costs

30 days, set with `--storage.tsdb.retention.time=30d` in the compose file, the
same window as the log TTL so an incident can be read across both. A test
fails if they drift apart.

45 series at a 15-second scrape for 30 days is roughly 8 million samples —
under 1 GB with index and WAL. Prometheus's own metrics are the larger half,
which is why it scrapes itself once a minute rather than every 15 seconds.

**There is no backup of the TSDB**, on purpose: metrics are derived data with
a 30-day life, so losing them costs history, not correctness. Recorded in
[technical-debt](../14-risk-debt/technical-debt.md).
