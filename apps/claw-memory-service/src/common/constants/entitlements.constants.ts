/**
 * How long to wait for auth-service to answer an entitlement lookup.
 *
 * Explicit rather than inherited so the number is visible at the call site.
 * Measured against the running stack at concurrency 12: p50 17ms, p95 41ms,
 * max 65ms, zero failures — five seconds is already three orders of magnitude
 * of headroom, and raising it would only make a real outage take longer to
 * surface. The intermittent 503s were NOT timeouts.
 */
export const ENTITLEMENTS_TIMEOUT_MS = 5_000;
