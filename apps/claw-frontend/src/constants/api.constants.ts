// BASE_URL = '' means API_BASE_URL = '/api/v1' (relative). Browser sends
// to whichever host the page is on (claw.local, claw.example.com, an IP, etc.).
// Override with NEXT_PUBLIC_API_URL only if pointing to a remote backend.
const BASE_URL = process.env['NEXT_PUBLIC_API_URL'] ?? '';

export const API_BASE_URL = `${BASE_URL}/api/v1`;

/**
 * Paths that must never enter the token-refresh flow on a 401.
 *
 * The refresh flow ends, on failure, in `clearAuthStorage()` and a hard
 * redirect to `/login`. Two kinds of request must not hold that authority:
 *
 * - **The auth endpoints themselves.** A failed login retried through a
 *   refresh is a loop.
 * - **Telemetry ingest.** A log write is best-effort background traffic the
 *   user did not ask for. Letting one sign the user out — or, when a refresh is
 *   already in flight, letting a burst of them queue up and re-fire together —
 *   gives the least important request in the app the most destructive power.
 *   The ingest route is `@Public()`, so a 401 there means something is wrong
 *   with the proxy, not with the session.
 *
 * `/client-logs/batch` and NOT `/client-logs`: matching is by substring, and
 * the bare prefix would also cover the admin READ routes — `GET /client-logs`,
 * `/client-logs/stats`, `/client-logs/distinct` — which go through the same
 * client. Those are authenticated admin actions that SHOULD refresh; exempting
 * them would strand an admin on the log page behind a 401 that never retries.
 * The batch route is the only one the browser writes to.
 */
export const AUTH_REFRESH_EXEMPT_PATHS: ReadonlyArray<string> = [
  '/auth/login',
  '/auth/refresh',
  '/client-logs/batch',
] as const;
