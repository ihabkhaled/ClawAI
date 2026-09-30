/** How long an idempotency key remembers the command it produced. */
export const REMOTE_TRIGGER_IDEMPOTENCY_TTL_SECONDS = 24 * 60 * 60;

/** A claimed key whose fire has not finished yet. Short, so a crash frees the key. */
export const REMOTE_TRIGGER_PENDING_TTL_SECONDS = 60;

export const REMOTE_TRIGGER_PENDING_MARKER = 'pending';

export const REMOTE_TRIGGER_KEY_PREFIX = 'agent:remote-trigger:';
