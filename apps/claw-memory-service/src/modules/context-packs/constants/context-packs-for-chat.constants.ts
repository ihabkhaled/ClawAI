/** Most packs one chat turn may draw on (explicit + auto-applied together). */
export const CHAT_PACKS_MAX = 20;

/**
 * Tag on a pack created from a chat message: prefix + the user message id.
 * It is the idempotency key (a retried save finds the pack instead of making
 * a second one) and stays within the 64-char tag limit (6 + 58).
 */
export const SAVED_FROM_CHAT_TAG_PREFIX = 'chat:';

export const SAVED_FROM_CHAT_DESCRIPTION = 'Saved from chat';

/** How many packs a chat's "which pack?" card offers, newest first. */
export const CHAT_PACK_OPTIONS_LIMIT = 50;
