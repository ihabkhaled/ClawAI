/**
 * The Prometheus exporter (ADR-113).
 *
 * The snapshot is cached because a scrape must not become a fan-out: every
 * `checkAll()` calls all 17 services, so a 15 s scrape would otherwise add
 * ~98,000 outbound health requests a day and as many log lines. The TTL is
 * just under the scrape interval, so each scrape gets a fresh measurement and
 * a second scraper (or a curl) rides along on the same one.
 */
export const METRICS_SNAPSHOT_TTL_MS = 14_000;

/** What the exporter publishes. Prometheus reads names, not comments. */
export const METRIC_SERVICE_UP = 'claw_service_up';
export const METRIC_SERVICE_RESPONSE_MS = 'claw_service_response_ms';
export const METRIC_SERVICES_TOTAL = 'claw_services_total';
export const METRIC_SERVICES_UP = 'claw_services_up';
export const METRIC_SNAPSHOT_AGE_MS = 'claw_health_snapshot_age_ms';

/**
 * The only labels any metric here may carry (rules/19).
 *
 * A metric is stored forever-ish and is readable by anyone who can reach the
 * dashboard, so it carries infrastructure identity and nothing else: no user
 * id, no email, no thread id, no token, no request body.
 */
export const ALLOWED_METRIC_LABELS: readonly string[] = ['service'];
