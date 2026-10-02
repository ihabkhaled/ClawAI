/**
 * Guards that limit how often a route may be called but ask for no credential.
 * A route carrying only these is still anonymous for the default-deny inventory
 * (ADR-147: sign-in and sign-up routes are rate-limited, not authenticated).
 */
export const NON_CREDENTIAL_GUARD_NAMES: readonly string[] = ['AgentAuthRateLimitGuard'];
