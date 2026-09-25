// PAYG metering of audio transcription (multimodal batch 4).
//
// These are ESTIMATION bounds used to size a hold before the provider has
// measured anything. None of them is a price: prices live in routing-service's
// `ModelCostVersion` rows (rule 37 item 13). Declaration ownership: rules/12.

/** Prefix of every transcription `requestId`: `transcription:${fileId}:${provider}`. */
export const TRANSCRIPTION_PAYG_REQUEST_ID_PREFIX = 'transcription';

/**
 * The LOWEST bitrate we assume an uploaded recording could have, in bytes per
 * second (1,000 B/s = 8 kbps). Dividing the file size by a FLOOR gives the
 * LONGEST the clip could plausibly be, so the hold errs high and the finalize
 * (on measured seconds or tokens) gives the difference back. Real voice notes
 * are 16-128 kbps, so this over-holds 2-16x for the few seconds the call runs.
 */
export const TRANSCRIPTION_PAYG_MIN_AUDIO_BYTES_PER_SECOND = 1_000;

/**
 * Upper bound on any audio-seconds figure sent to the meter. Equals auth-
 * service's `CREDIT_AUDIO_SECONDS_MAX` wire validation: a value above it is a
 * 400 on reserve (fail closed) and a swallowed 400 on finalize (charged $0).
 */
export const TRANSCRIPTION_PAYG_MAX_AUDIO_SECONDS = 7_200;

/** A clip is never estimated below one second — a zero-unit hold is a $0 hold. */
export const TRANSCRIPTION_PAYG_MIN_AUDIO_SECONDS = 1;

/**
 * Gemini tokenises input audio at 32 tokens per second (Google's published
 * figure). Gemini rows are priced per TOKEN, so the hold is sized in tokens.
 */
export const GEMINI_AUDIO_TOKENS_PER_SECOND = 32;

/** Headroom for `TRANSCRIPTION_INSTRUCTION` and request framing, in prompt tokens. */
export const TRANSCRIPTION_PAYG_INSTRUCTION_TOKENS = 128;

/**
 * Output ceiling per second of audio for a token-priced (Gemini) transcript.
 * Fast speech is ~3-4 tokens/s; 8 leaves room for dense speech.
 */
export const TRANSCRIPTION_PAYG_OUTPUT_TOKENS_PER_SECOND = 8;

/** Fixed output headroom: Gemini 2.5 counts thinking tokens inside `maxOutputTokens`. */
export const TRANSCRIPTION_PAYG_OUTPUT_TOKEN_HEADROOM = 1_024;

/**
 * Whisper has no output-token parameter and its row prices output at 0; the
 * wire requires `requestedMaxOutputTokens >= 1`, so this is a formality.
 */
export const TRANSCRIPTION_PAYG_UNIT_PRICED_OUTPUT_TOKENS = 1;

/** Fallback when Gemini omits `usageMetadata`: transcript characters per token. */
export const TRANSCRIPTION_PAYG_CHARS_PER_TOKEN = 4;

export const TRANSCRIPTION_INSUFFICIENT_CREDIT_MESSAGE =
  'Not enough credit to transcribe this recording. Add credit, then upload it again.';

export const TRANSCRIPTION_CREDIT_CHECK_UNAVAILABLE_MESSAGE =
  'Audio transcription is temporarily unavailable because the credit check could not be completed. Try again later.';

/**
 * Providers whose transcription is priced PER SECOND of input audio (a
 * per-unit `audioPerUnitMicroUsd` row), so the hold is sized in seconds and
 * the finalize carries the measured seconds. Every other provider is
 * token-priced (Gemini) and settles on reported tokens.
 */
export const TRANSCRIPTION_PAYG_PER_SECOND_PROVIDERS: readonly string[] = Object.freeze(['OPENAI']);

/** Axios error codes that mean the provider call timed out, not failed. */
export const TRANSCRIPTION_PAYG_TIMEOUT_ERROR_CODES: readonly string[] = Object.freeze([
  'ECONNABORTED',
  'ETIMEDOUT',
]);
