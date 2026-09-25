/**
 * Timestamps a user can name in a question about a video (multimodal batch 8,
 * `parseQuestionTimestamps`). Deterministic; no model is asked.
 *
 * Applied in this order, and a later pattern never re-reads a span an earlier
 * one matched — so "at 1 minute 30 seconds" is one timestamp, not two.
 *
 * Deliberate choices, pinned by `video-frame-selection.utility.spec.ts`:
 *   - A clock needs two-digit seconds: `2:35`, `02:35`, `1:02:03`. So `3:1`,
 *     `16:9` and `4:3` (ratios) never match, and a decimal (`version 2.5`)
 *     never does either.
 *   - A clock followed by am/pm is a time of day, not a video position.
 *   - A bare number with a unit needs a cue word (`at 95s`, `around 2
 *     minutes`, `the 2 minute mark`) — "a 5 minute video" is a length.
 *   - Accepted false positives: a verse reference (`John 3:16`) and a 24-hour
 *     time (`14:30`) read as positions. Both are clamped/dropped against the
 *     real duration and only shift which frames are sampled.
 */

/** `mm:ss` or `h:mm:ss`; not inside a longer number, not a time of day. */
export const CLOCK_TIMESTAMP_PATTERN =
  /(?<![\d.:])(\d{1,2}):([0-5]\d)(?::([0-5]\d))?(?![\d:])(?!\s*(?:am|pm|a\.m\.|p\.m\.)(?![a-z]))/giu;

/** `1 minute 30`, `1m30s`, `2 min and 5 sec`, `1 minute 30 seconds`. */
export const MINUTES_SECONDS_PATTERN =
  /(?<![\d.])(\d{1,3})\s*(?:minutes?|mins?|m)\s*(?:and\s+)?(\d{1,2})(?:\s*(?:seconds?|secs?|s)(?![a-z]))?(?![\d.:])/giu;

/** `at 2 minutes`, `around 3 min`, `the 2 minute mark`, `minute 4`. */
export const MINUTES_ONLY_PATTERNS: readonly RegExp[] = [
  /\b(?:at|around|near|about|after|from|by|until|till|to)\s+(\d{1,3})\s*(?:minutes?|mins?|m)(?![a-z])/giu,
  /(?<![\d.])(\d{1,3})\s*(?:minutes?|mins?)\s+mark\b/giu,
  /\bminute\s+(\d{1,3})\b/giu,
  /الدقيقة\s+(\d{1,3})/gu,
];

/** `at 95s`, `around 40 seconds`, `the 30 second mark`, `second 12`. */
export const SECONDS_ONLY_PATTERNS: readonly RegExp[] = [
  /\b(?:at|around|near|about|after|from|by|until|till|to)\s+(\d{1,5})\s*(?:seconds?|secs?|s)(?![a-z])/giu,
  /(?<![\d.])(\d{1,5})\s*(?:seconds?|secs?)\s+mark\b/giu,
  /\bsecond\s+(\d{1,5})\b/giu,
  /(?<![\d.])(\d{1,5})\s*ثانية/gu,
];

/** Arabic-Indic (U+0660–0669) and Extended Arabic-Indic (U+06F0–06F9) digit blocks. */
export const ARABIC_INDIC_DIGIT_ZERO = 0x0660;
export const EXTENDED_ARABIC_INDIC_DIGIT_ZERO = 0x06f0;
export const ARABIC_DIGIT_PATTERN = /[٠-٩۰-۹]/gu;

/** A question longer than this is scanned only up to here (bounded work). */
export const TIMESTAMP_SCAN_MAX_CHARS = 4_000;

export const SECOND_MS = 1_000;
export const MINUTE_MS = 60_000;
export const HOUR_MS = 3_600_000;
