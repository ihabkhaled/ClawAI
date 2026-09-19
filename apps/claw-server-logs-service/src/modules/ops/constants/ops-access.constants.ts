/** `Authorization: Ops claw_ops_...` — distinct from Bearer so it can never be mistaken for a session. */
export const OPS_AUTH_SCHEME = 'Ops ';

export const OPS_TOKEN_VERIFY_PATH = '/api/v1/internal/ops-tokens/verify';

export const OPS_TOKEN_VERIFY_TIMEOUT_MS = 3_000;

/**
 * A verified token is trusted this long without asking auth-service again.
 * Short on purpose: revoking a token takes effect within this window.
 */
export const OPS_TOKEN_CACHE_TTL_MS = 30_000;

export const OPS_TOKEN_CACHE_MAX_ENTRIES = 100;

/** The one scope ops tokens carry today (auth-service OpsTokenScope). */
export const OPS_SCOPE_LOGS_READ = 'LOGS_READ';
