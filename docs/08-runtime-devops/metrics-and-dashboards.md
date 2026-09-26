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

| Metric                        | Type  | Labels    | Meaning                                                                                                                                                                                                                                                                           |
| ----------------------------- | ----- | --------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `claw_service_up`             | gauge | `service` | 1 when the service answered its health check, 0 when it did not. Also `service="clamav"`: clamd as reported by file-service, and `service="crawl4ai"`/`"flaresolverr"`/`"firecrawl"`: scraper sidecars as reported by research-service — only while enabled (`DEPENDENCY_PROBES`) |
| `claw_service_response_ms`    | gauge | `service` | How long that answer took. Absent while a service is down                                                                                                                                                                                                                         |
| `claw_services_total`         | gauge | —         | How many services are checked (17)                                                                                                                                                                                                                                                |
| `claw_services_up`            | gauge | —         | How many answered                                                                                                                                                                                                                                                                 |
| `claw_health_snapshot_age_ms` | gauge | —         | Age of the snapshot this scrape was served from. Near the scrape interval is normal; growing means the exporter is not refreshing                                                                                                                                                 |

**A health metric carries `service` and nothing else** (the media metrics
below bound theirs differently). The renderer throws on any other label: metrics live for a month and are read by anyone with the
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

## Media metrics: each media service exports its own (pack §67, 2026-09-26)

chat-service, file-service and image-service each serve `GET /api/v1/metrics`
from an in-process registry (`MetricsRegistry` in `@claw/shared-utilities`,
no library). Internal only: nginx has no `/api/v1/metrics` location, so the
path falls to the frontend; the route is `@Public()` because Prometheus has no
JWT. Prometheus scrapes them as `claw-chat-media` (DNS discovery — one target
per chat replica, 4 in prod), `claw-file-media` and `claw-image-media`.
Counters reset on a restart; always read them through `rate()` / `increase()`.

**Labels are bounded by construction.** Each label declares its allowed values
(an enum, or a fixed provider list); any other value is recorded as `other`,
and keys a metric did not declare are never read. A user id, file id, message
id, prompt or free-text model name cannot become a series.

| Metric                                                                    | Type                | Labels                                                                                                                                      | Where it is recorded                                                                             |
| ------------------------------------------------------------------------- | ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `claw_file_transcription_attempts_total`                                  | counter             | `provider` (gemini, openai), `outcome` (success, empty, refused, rate_limited, failed, cancelled)                                           | `TranscriptionManager.tryCandidate`, per provider call                                           |
| `claw_file_transcription_job_duration_seconds`                            | histogram           | `source` (upload, video_audio), `status` (completed, refused, failed, cancelled)                                                            | one job, every call and retry                                                                    |
| `claw_file_video_processing_total` / `_duration_seconds`                  | counter / histogram | `outcome` (completed, no_speech, no_audio, transcription_failed, failed, cancelled)                                                         | `VideoProcessingManager.process`, before the single write                                        |
| `claw_file_media_queue_wait_seconds`                                      | histogram           | `job` (transcription, video)                                                                                                                | consumer start minus the event's `timestamp`                                                     |
| `claw_chat_attachment_delivery_total`                                     | counter             | `mode` (every `FileDeliveryMode`)                                                                                                           | `AttachmentDeliveryManager.plan`, per decision; plus one `derived_image_text` per helper upgrade |
| `claw_chat_vision_helper_calls_total`                                     | counter             | `outcome` (`VisionHelperOutcome`)                                                                                                           | `VisionHelperManager.finish`, per attempt                                                        |
| `claw_chat_tts_segment_attempts_total`                                    | counter             | `provider` (gemini, openai), `outcome` (`SpeechAttemptOutcome`, incl. rate_limited, refused)                                                | `SpeechSynthesisManager`, per attempt                                                            |
| `claw_chat_tts_first_segment_seconds`                                     | histogram           | `provider`                                                                                                                                  | job start → segment 1 stored                                                                     |
| `claw_chat_tts_jobs_total` / `claw_chat_tts_job_duration_seconds`         | counter / histogram | `status` (`SpeechJobStatus`)                                                                                                                | `SpeechJobManager.run`, when the job ends                                                        |
| `claw_image_generations_total` / `claw_image_generation_duration_seconds` | counter / histogram | `provider` (image_openai, image_gemini, image_grok, image_local, image_local_comfyui), `outcome` (completed, failed, cancelled, superseded) | `ImageGenerationService.processJob`, per attempt                                                 |

`omitted_no_vision` counts the plan's decision for a blind lane BEFORE the
helper; `derived_image_text` counts the helper's upgrades of it. `superseded`
is an AUTO image attempt that failed and handed the job to the next provider.

Dashboard: `infra/grafana/dashboards/claw-multimodal.json` ("ClawAI —
Multimodal"). Useful queries:

```promql
# Transcription failure share over the last hour, per provider
sum by (provider) (increase(claw_file_transcription_attempts_total{outcome!="success"}[1h]))
  / sum by (provider) (increase(claw_file_transcription_attempts_total[1h]))

# Read-aloud time to first audio, p95, all chat replicas
histogram_quantile(0.95, sum by (le) (rate(claw_chat_tts_first_segment_seconds_bucket[15m])))

# How often a blind lane got no helper description
sum(increase(claw_chat_attachment_delivery_total{mode="omitted_no_vision"}[1d]))
  - sum(increase(claw_chat_attachment_delivery_total{mode="derived_image_text"}[1d]))

# Media queue backlog signal
histogram_quantile(0.95, sum by (le, job) (rate(claw_file_media_queue_wait_seconds_bucket[15m])))
```

Adding one: [`skills/add-a-service-metric.md`](../../skills/add-a-service-metric.md).

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
