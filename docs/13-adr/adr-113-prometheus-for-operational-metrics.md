# ADR-113: Prometheus holds operational metrics; health-service exports them

**Status**: Accepted
**Date**: 2026-09-20

## Context

The platform could say what happened and could not say what is happening.
Logs from every container land in one store (ADR-101) and are readable without
SSH (ADR-102); business events and per-call cost sit in audit-service. None of
that answers "is production healthy right now, and was it healthy an hour
ago".

`health-service` already checks all 17 services on request, but only on
request: no history, no page, no alerting.
`docs/LOGGING_OBSERVABILITY_ARCHITECTURE.md` said the same in its own words —
the platform is forensic, not operational.

## Decision

1. **Prometheus stores the metrics.** The owner chose it over rolling numbers
   into the existing Mongo: a time series database for time series, at the cost
   of one more container.
2. **Retention is 30 days**, the same as the log TTL, so an incident can be
   read across both. `tools/__tests__/observability-stack.test.mjs` fails if
   the two drift apart.
3. **Prometheus is never published.** It authenticates nobody, so it stays on
   the internal Docker network: no `ports:`, no nginx route. It scrapes over
   HTTPS and verifies the stack's own CA.
4. **health-service exports, it does not measure twice.** `GET
/api/v1/metrics` renders the same fan-out `/api/v1/health` answers:
   `claw_service_up`, `claw_service_response_ms`, `claw_services_total`,
   `claw_services_up`, `claw_health_snapshot_age_ms`.
5. **The snapshot is cached just under the scrape interval** (14 s against
   15 s). Without it, every scrape would fan out to 17 services — about 98,000
   extra requests a day — and two scrapers arriving together would double it.
   Concurrent scrapes share one refresh.
6. **A metric carries only the labels on an allowlist** (`service`). Rendering
   throws on anything else, so a user id or a token cannot reach a store that
   keeps data for a month and is read by anyone with the dashboard.
7. **A repeated status is not news.** `checkAll` logs at INFO only when the
   aggregate status changes, at debug otherwise: the healthcheck and the
   scraper together produced ~11,500 identical lines a day in the log store.

## Consequences

- One more container, one more named volume. The series are small: 45 series
  at 15 s for 30 days is roughly 8 million samples, under 1 GB with index and
  WAL. Prometheus's own self-scrape dominates that, which is why it is scraped
  once a minute instead of every 15 seconds.
- **health-service will read back what it exports** once the status page (B3)
  queries Prometheus through it. The exporter becoming a client of its own
  store is deliberate: the browser must never talk to Prometheus directly.
- A config change is a **recreate**, never a restart: `prometheus.yml` is a
  bind-mounted file and a restart keeps the old inode. `deploy-prod.sh` does
  this through `CONFIG_DIR_SERVICES`, which exists because image-only
  containers were invisible to the deployment plan until 2026-09-20.
- The TSDB has **no backup**. Metrics are derived data with a 30-day life;
  losing them costs history, not correctness. Recorded as debt rather than
  solved.
- Grafana and the in-app status page are separate batches. Neither is in this
  one.

## Alternatives

- **Roll metrics into Mongo** (`server-logs-service`). No new container, and
  the pages could read it directly. Rejected by the owner: no query language,
  no dashboards, and rollups are a database we would have to write.
- **A `prom-client` counter in every service's request pipeline.** More
  faithful per-route data, and a blast radius of every service. Deferred to
  its own batch.
- **Grafana with its own login.** Rejected: a second authentication system for
  operational data, with no attribution or revocation (see the Grafana batch).

## Verified live (2026-09-20)

- `GET /api/v1/metrics` inside the network renders every service.
- Prometheus target `claw-services` is **up** over HTTPS with the stack CA.
- Stored series: 17 `claw_service_up`, `claw_services_up = 16`, and
  `claw_service_up{service="llamacpp-service"} = 0` — the one service that is
  genuinely down (local-AI is off).
- Log noise after the change: **0** INFO lines a minute in steady state,
  against ~8 before; the repeats are debug, which the shipper already drops.
- Tests: the renderer (13 cases, including refused labels and an injection
  attempt through a label value), the cache (5 cases), and the compose/deploy
  wiring (9 cases).
- **Not verified**: anything in production. It has not been deployed since
  2026-09-17 and no deploy is approved.

## Addendum: media metrics are exported by the services themselves (2026-09-26)

The multimodal pack (§67) needs counts no health check can see: transcription
calls by outcome, video jobs, read-aloud segments, image generations. The
deferred alternative ("a counter in every service") is now taken, narrowly:

- **Three services, not all.** chat-, file- and image-service serve
  `GET /api/v1/metrics` from `MetricsRegistry` (`@claw/shared-utilities`,
  ~150 lines, no `prom-client`: a new dependency in three services for two
  metric kinds was not worth it). The route is `@Public()` and internal only —
  nginx has no location for it (a test in `observability-stack.test.mjs`).
- **The label rule changes shape, not strength.** Health metrics keep the
  `service`-only allowlist. A media metric declares every label's allowed
  VALUES; anything else is recorded as `other` and undeclared keys are never
  read, so an id cannot become a series. Recording never throws (a metric must
  not fail the request it measures); a bad declaration throws at boot.
- **chat-service is discovered per replica** (`dns_sd_configs`, type A): each
  of the 4 production replicas keeps its own counters, and a static target
  would scrape one at random. PromQL sums across `instance`.
- **Counters reset on restart** — read them through `rate()`/`increase()`.
- Rejected: pushing counts to health-service over HTTP (a second hop and a
  cache for numbers Prometheus can scrape directly), and RabbitMQ events
  into audit-service (forensic store, no rates).

Operational consequence: a change to `infra/prometheus/prometheus.yml` or the
new dashboard is a **recreate** of `prometheus` / `grafana`, as before. The new
`@claw/shared-utilities` export means dev containers need `service:rebuild`
(baked packages), not a restart. Metric list: `docs/08-runtime-devops/metrics-and-dashboards.md`.
