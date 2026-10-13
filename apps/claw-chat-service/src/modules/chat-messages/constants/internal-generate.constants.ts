/**
 * Time limits for the internal `generate-stream` endpoint (ADR-175).
 *
 * These are protocol constants, not tenant settings and not environment
 * variables: the calling service mirrors the same numbers, and a value that
 * differs between the two hops makes the lower hop's failure unreadable
 * (an anonymous socket abort instead of a coded error frame).
 */

/**
 * No byte from the provider for this long means the model is stuck.
 *
 * Reset on EVERY chunk the provider sends, answer or thinking or an SSE
 * comment, because a reasoning model that is still thinking is still working.
 * Also covers the wait for the first byte.
 */
export const INTERNAL_GENERATE_IDLE_TIMEOUT_MS = 300_000;

/**
 * Absolute ceiling for ONE provider call, never reset.
 *
 * The PAYG hold is reclaimable after `PAYG_RESERVATION_TTL_MS` (15 min) plus the
 * sweeper interval, so a call must finish well inside that or its hold can be
 * swept mid-flight and settlement fails. No draft within the 32,768-token
 * output cap needs longer.
 */
export const INTERNAL_GENERATE_MAX_TOTAL_MS = 600_000;

/**
 * Ceiling for a provider that cannot stream (its connector says
 * `supportsStreaming: false`).
 *
 * No byte flows until the model has finished, so there is no activity to reset
 * a timer with and absolute time is the only guard that exists. The same figure
 * as the streaming ceiling, so a caller reasons about one number.
 */
export const INTERNAL_GENERATE_BUFFERED_MAX_MS = 600_000;

/**
 * An `activity` frame is written at most this often.
 *
 * A thinking model sends hundreds of tiny frames a second. The caller only
 * needs proof of life inside a 300 s window, so one frame a second is the same
 * information without a write per token.
 */
export const INTERNAL_GENERATE_ACTIVITY_MIN_INTERVAL_MS = 1_000;

/**
 * How much of a non-stream body is kept to recognise a provider that answered a
 * `stream: true` request with one plain JSON document.
 */
export const INTERNAL_GENERATE_RAW_BODY_CAP_CHARS = 4_000_000;

export const INTERNAL_GENERATE_NDJSON_CONTENT_TYPE = 'application/x-ndjson; charset=utf-8';

/** Machine codes the caller keys on. Free text is never forwarded as a code. */
export const INTERNAL_GENERATE_CODE_IDLE_TIMEOUT = 'MODEL_IDLE_TIMEOUT';
export const INTERNAL_GENERATE_CODE_HARD_CEILING = 'MODEL_HARD_CEILING';
export const INTERNAL_GENERATE_CODE_REASONED_NO_ANSWER = 'MODEL_REASONED_NO_ANSWER';
export const INTERNAL_GENERATE_CODE_CLIENT_ABORTED = 'CLIENT_ABORTED';
export const INTERNAL_GENERATE_CODE_EMPTY_RESPONSE = 'CLOUD_PROVIDER_EMPTY_RESPONSE';
export const INTERNAL_GENERATE_CODE_FAILED = 'INTERNAL_GENERATE_FAILED';
export const INTERNAL_GENERATE_CODE_PROVIDER_UNREACHABLE = 'PROVIDER_UNREACHABLE';

/** A machine code is upper snake case, 3 to 60 characters. */
export const INTERNAL_GENERATE_CODE_PATTERN = /^[A-Z][A-Z0-9_]{2,59}$/;

/** The longest `message` an error frame carries. */
export const INTERNAL_GENERATE_ERROR_MESSAGE_MAX_CHARS = 300;

export const INTERNAL_GENERATE_FAILED_MESSAGE = 'The model call failed';
export const INTERNAL_GENERATE_UNREACHABLE_MESSAGE = 'The model provider could not be reached';
