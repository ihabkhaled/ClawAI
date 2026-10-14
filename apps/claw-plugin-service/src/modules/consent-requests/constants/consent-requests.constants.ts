/** How long the card waits for a yes or no. After this a request reads EXPIRED and the call is denied safely. */
export const CONSENT_REQUEST_TTL_MS = 120_000;
/** "Allow for this chat" lasts this long (or until the user revokes it). */
export const CHAT_GRANT_TTL_MS = 24 * 60 * 60 * 1000;

/** The internal wait is a bounded long poll over the database: replica-safe, never open-ended. */
export const CONSENT_WAIT_MAX_MS = 20_000;
export const CONSENT_WAIT_POLL_MS = 500;

export const CONSENT_LIST_LIMIT = 20;
export const CHAT_GRANT_LIST_LIMIT = 100;
export const CONSENT_CACHE_CONTROL = 'private, no-store';

export const REQUEST_ID_MAX = 100;
