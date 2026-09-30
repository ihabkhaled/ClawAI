/** The window a breakdown covers when the caller names none. */
export const USAGE_BREAKDOWN_DEFAULT_DAYS = 30;

/**
 * The widest window one request may aggregate. Bounded so a single call can
 * never become a full-table scan of the ledger.
 */
export const USAGE_BREAKDOWN_MAX_DAYS = 92;

export const USAGE_BREAKDOWN_DAY_MS = 86_400_000;

/**
 * The surface a ledger row reports when it was written with no workflow. The
 * ledger records a null there, and a null is not the same as "chat" — so it is
 * shown as what it is rather than guessed at.
 */
export const USAGE_UNATTRIBUTED_SURFACE = 'unattributed';

/** Most model lines one breakdown returns; the rest fold into the totals only. */
export const USAGE_BREAKDOWN_MAX_LINES = 50;

/** Most members one organization aggregate reads. */
export const ORGANIZATION_USAGE_MAX_MEMBERS = 500;

export const ORGANIZATION_USAGE_SCOPE_PATH_PREFIX = '/api/v1/internal/agent/organizations';
export const ORGANIZATION_USAGE_SCOPE_TIMEOUT_MS = 5_000;
export const ORGANIZATION_ID_MAX_LENGTH = 64;

/** Where agent-service answers when AGENT_SERVICE_URL is not set. */
export const ORGANIZATION_USAGE_DEFAULT_AGENT_URL = 'https://agent-service:4015';
