/**
 * Grafana behind the admin session (ADR-115).
 *
 * The page lives on the same origin under /grafana/, served by nginx only to a
 * browser that holds the short-lived admin cookie. The cookie is minted by
 * GRAFANA_ACCESS_ENDPOINT, an ordinary authenticated API call.
 */
export const GRAFANA_PATH = '/grafana/';
export const GRAFANA_ACCESS_ENDPOINT = '/auth/grafana-access';
