/**
 * Zero data retention (F055, backend half).
 *
 * The coding agent sends `X-Claw-Zero-Retention: 1` on every request while the
 * user has zero data retention on (`apps/claw-coding-agent/src/core/
 * zero-retention.constants.ts`). Node lower-cases incoming header names.
 */
export const ZERO_RETENTION_HEADER = 'x-claw-zero-retention';

/** The only value that turns it on; anything else is an ordinary request. */
export const ZERO_RETENTION_HEADER_ON = '1';

/** What a purged message's `content` becomes. Non-empty: some providers reject an empty turn. */
export const ZERO_RETENTION_REDACTED_CONTENT = '[not retained: zero data retention]';

/**
 * Metadata keys a purged message keeps. Identifiers and error codes only —
 * never text. Everything else (reasoning, narration, research transcript,
 * progress summaries, file references) is dropped with the content.
 */
export const ZERO_RETENTION_KEPT_METADATA_KEYS: readonly string[] = [
  'runtimeV2',
  'sourceMessageId',
  'error',
  'errorCode',
  'errorMessageKey',
];

/** Redis marker: this chat turn (keyed by its user message id) must be purged when it ends. */
export const ZERO_RETENTION_TURN_KEY_PREFIX = 'chat:zero-retention:turn:';

/** Redis marker: this Runtime V2 run must be purged when it reaches a terminal state. */
export const ZERO_RETENTION_RUN_KEY_PREFIX = 'chat:zero-retention:run:';

/**
 * Marker lifetime. Longer than a Runtime V2 run's own TTL (1 h), so a run that
 * is still alive when it ends always finds its marker.
 */
export const ZERO_RETENTION_MARKER_TTL_SECONDS = 86_400;

/** Terminal states that end a run for good. `paused` is resumable, so its transcript must survive. */
export const ZERO_RETENTION_PURGE_STATUSES: readonly string[] = [
  'completed',
  'failed',
  'cancelled',
];
