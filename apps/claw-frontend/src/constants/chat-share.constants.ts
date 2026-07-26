/** Path prefix of the public shared-chat route. Single source of truth. */
export const SHARE_CHAT_PATH_PREFIX = '/share/chat';

/** How long a fetched owner-share view stays fresh (30 s). */
export const CHAT_SHARE_STALE_MS = 30_000;

/** How long the "copied" state shows on the copy-URL button. */
export const CHAT_SHARE_COPY_FEEDBACK_MS = 2000;

/**
 * Names for the in-flight action, so a single pending value can drive per-control
 * spinners instead of disabling the whole dialog.
 */
export const CHAT_SHARE_ACTIONS = {
  PUBLISH: 'publish',
  INDEXING: 'indexing',
  REFRESH: 'refresh',
  REGENERATE: 'regenerate',
  REVOKE: 'revoke',
} as const;

/**
 * Message count after which an inline ad may appear on a public shared chat.
 *
 * Deterministic and generous on purpose: an ad after every few messages reads as
 * ad-stuffing, and an ad on a three-message chat has nothing to sit between.
 */
export const SHARED_CHAT_INLINE_AD_AFTER_MESSAGES = 6;

/** Longest meta description we will emit for a shared chat. */
export const SHARED_CHAT_DESCRIPTION_MAX_CHARS = 160;
