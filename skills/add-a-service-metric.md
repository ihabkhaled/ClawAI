# Add a metric to a service

For a count or a duration a health check cannot see (ADR-113 addendum "media
metrics"). chat-, file- and image-service already export one; copy their
`src/modules/metrics/` folder for a new service.

## Steps

1. **Declare it** in the service's `modules/metrics/constants/*-media-metrics.constants.ts`
   as a `CounterDefinition` or `HistogramDefinition` (`@claw/shared-utilities`):
   - name `claw_<service>_<thing>_total` (counter) or `_seconds` (histogram);
   - every label's allowed values: `Object.values(SomeEnum)` or a fixed list.
     Anything else will be recorded as `other` — that is the point.
   - Never a label for a user, file, message, thread, prompt, model name or path.
2. **Add a typed method** on the service's `*MediaMetricsService` (enum
   parameters, never `string` for an outcome). It is the only place that
   touches the registry.
3. **Record at the one code path that decides the outcome** — the place that
   already logs it. Inject the metrics service (`@Optional()` if many hand-built
   specs construct the class; the global `MetricsModule` provides it at runtime).
4. **Test it on the real path**: build the class with `new XMediaMetricsService()`,
   drive the path, assert the exact line in `metrics.render()` and that no id
   appears in it.
5. **Scrape and show it**: a new service needs a job in
   `infra/prometheus/prometheus.yml` (HTTPS, `server_name` = the service,
   `dns_sd_configs` if it runs replicas) and an entry in
   `tools/__tests__/observability-stack.test.mjs`; a panel goes in a dashboard
   ([add-a-grafana-dashboard](add-a-grafana-dashboard.md)).
6. **Document it** in the table in `docs/08-runtime-devops/metrics-and-dashboards.md`.

## Traps

- A new `/api/v1/metrics` route must stay off nginx; the observability test fails if a location appears.
- The service's logging interceptor must list `/api/v1/metrics` in `ROUTINE_SUCCESS_PATHS` (`common/constants/routine-routes.constants.ts`, read by `isRoutineRoute`) (or `@SkipLogging()` in chat-service) — a scrape every 15 s is otherwise a log line every 15 s.
- Counters reset on restart; dashboards use `rate()`/`increase()`, never the raw value.
- A new `@claw/shared-utilities` import crashes dev containers until `service:rebuild`.
- Prometheus and Grafana config are bind-mounted: **recreate**, not restart.
