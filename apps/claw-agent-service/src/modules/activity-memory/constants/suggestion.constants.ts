/**
 * V2 Stream 05 — activity-driven suggestion thresholds.
 */

/** Minimum occurrences of a (userId, kind) pair in 7 days to emit a suggestion. */
export const SUGGESTION_MIN_OCCURRENCES = 5;

/** Cap on the number of source-activity ids stored per suggestion row. */
export const SUGGESTION_MAX_SOURCE_IDS = 50;

/** Days a PENDING suggestion lives before being marked EXPIRED. */
export const SUGGESTION_PENDING_TTL_DAYS = 14;

/** Cron cadence — every hour at minute 7 (offset to avoid round-hour spikes). */
export const SUGGESTION_SCAN_CRON = '0 7 * * * *';

/** Rolling activity window scanned per tick. */
export const SUGGESTION_LOOKBACK_DAYS = 7;
