/** Wire contract: the frontend translates these. Never rename. */
export const SESSION_NOT_FOUND_CODE = 'SESSION_NOT_FOUND';
export const SESSION_TERMINATED_CODE = 'SESSION_TERMINATED';
export const CURRENT_SESSION_CONFIRM_REQUIRED_CODE = 'CURRENT_SESSION_CONFIRM_REQUIRED';
export const SESSION_ACTIVE_CANNOT_CLEAR_CODE = 'SESSION_ACTIVE_CANNOT_CLEAR';
export const GLOBAL_PASSWORD_INVALID_CODE = 'GLOBAL_PASSWORD_INVALID';
export const GLOBAL_PASSWORD_LOCKED_CODE = 'GLOBAL_PASSWORD_LOCKED';
export const GLOBAL_TOKEN_INVALID_CODE = 'GLOBAL_TOKEN_INVALID';
export const GLOBAL_PHRASE_INVALID_CODE = 'GLOBAL_PHRASE_INVALID';

export const SESSION_LIST_DEFAULT_PAGE_SIZE = 20;
export const SESSION_LIST_MAX_PAGE_SIZE = 100;

/** A revocation write set is published in pipelined batches of this many ids, so memory stays bounded. */
export const REVOCATION_BATCH_SIZE = 1_000;

/** Typed phrase for each dangerous action. Compared exactly. */
export const GLOBAL_TERMINATE_PHRASE = 'TERMINATE ALL';
export const GLOBAL_CLEAR_PHRASE = 'CLEAR ALL LOGS';

/** The one-time confirmation token: random, hashed at rest, single use, bound to admin + action. */
export const GLOBAL_TOKEN_BYTES = 32;
export const GLOBAL_TOKEN_TTL_SECONDS = 60;
export const GLOBAL_TOKEN_KEY_PREFIX = 'auth:session-global-token:';

/** Wrong passwords for this step: 5 per 15 minutes per admin, then locked until the window ends. */
export const GLOBAL_PASSWORD_MAX_FAILURES = 5;
export const GLOBAL_PASSWORD_WINDOW_SECONDS = 15 * 60;
export const GLOBAL_PASSWORD_FAILURE_KEY_PREFIX = 'auth:session-global-pw-fail:';

/** Safety cap for the system-wide kill loop: 10,000 batches of REVOCATION_BATCH_SIZE rows. */
export const MAX_GLOBAL_BATCHES = 10_000;
