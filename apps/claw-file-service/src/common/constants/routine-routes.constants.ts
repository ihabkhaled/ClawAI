/**
 * Routes whose SUCCESSFUL calls are not worth a log line.
 *
 * - `/api/v1/health` — the container healthcheck, every few seconds.
 * - `/api/v1/metrics` — the Prometheus scrape, every 15 s (ADR-113 addendum
 *   "media metrics"). Logged, it would fill the 30-day log store with the
 *   same line.
 *
 * A failure on either still logs: only a status below 400 is quiet.
 */
export const ROUTINE_SUCCESS_PATHS: ReadonlyArray<string> = ['/api/v1/health', '/api/v1/metrics'];
