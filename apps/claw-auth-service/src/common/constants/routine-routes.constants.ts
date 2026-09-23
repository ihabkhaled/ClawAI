/**
 * Routes whose SUCCESSFUL calls are not worth a log line.
 *
 * - `/api/v1/health` — the container healthcheck, every few seconds.
 * - `/api/v1/auth/grafana-access/verify` — nginx's `auth_request` for Grafana
 *   (ADR-115). One call per Grafana request, assets and panel queries
 *   included, so a single dashboard load is dozens of them. Logged, they would
 *   fill the 30-day log store with the same line (the trap ADR-113 §7 closed
 *   for the metrics scrape).
 *
 * A failure on either still logs: only a status below 400 is quiet.
 */
export const ROUTINE_SUCCESS_PATHS: ReadonlyArray<string> = [
  '/api/v1/health',
  '/api/v1/auth/grafana-access/verify',
];
