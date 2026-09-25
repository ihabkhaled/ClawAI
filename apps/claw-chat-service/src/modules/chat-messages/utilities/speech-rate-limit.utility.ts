import { SpeechProviderError } from '../../../common/errors';
import {
  GEMINI_RESOURCE_EXHAUSTED_STATUS,
  GEMINI_RETRY_INFO_TYPE,
  HTTP_TOO_MANY_REQUESTS,
  MS_PER_SECOND,
  OPENAI_QUOTA_EXHAUSTED_CODE,
  SPEECH_RATE_LIMIT_BASE_BACKOFF_MS,
  SPEECH_RATE_LIMIT_JITTER_RATIO,
  SPEECH_RATE_LIMIT_MAX_WAIT_MS,
  SPEECH_RETRY_SECONDS_PATTERN,
} from '../constants/speech.constants';
import type { GeminiSpeechErrorBody } from '../types/speech.types';

/**
 * Pure helpers for a rate-limited "Read aloud" attempt (2026-09-25): is this
 * answer a rate limit, what wait did the provider ask for, and how long to
 * wait before the next try on the same candidate.
 */

/**
 * A retry hint as milliseconds: a Duration (`"7s"`, `"1.5s"`), bare seconds
 * (`"7"`, a Retry-After header) or an HTTP-date Retry-After relative to
 * `now`. Null for anything absent or unreadable — never a guess.
 */
export function parseRetryDelayMs(value: string | null | undefined, now: number): number | null {
  if (value === null || value === undefined || value.trim() === '') {
    return null;
  }
  const seconds = SPEECH_RETRY_SECONDS_PATTERN.exec(value);
  if (seconds?.[1] !== undefined) {
    return Math.round(Number(seconds[1]) * MS_PER_SECOND);
  }
  const at = Date.parse(value);
  return Number.isNaN(at) ? null : Math.max(0, at - now);
}

/** Gemini's own wait from a 429 body: the RetryInfo detail's `retryDelay`. */
export function geminiRetryDelayMs(error: GeminiSpeechErrorBody | undefined): number | null {
  const retryInfo = error?.details?.find((detail) => detail['@type'] === GEMINI_RETRY_INFO_TYPE);
  return parseRetryDelayMs(retryInfo?.retryDelay, 0);
}

/** A Gemini answer is a rate limit on HTTP 429 or a `RESOURCE_EXHAUSTED` body. */
export function isGeminiRateLimited(
  status: number,
  error: GeminiSpeechErrorBody | undefined,
): boolean {
  return status === HTTP_TOO_MANY_REQUESTS || error?.status === GEMINI_RESOURCE_EXHAUSTED_STATUS;
}

/**
 * An OpenAI 429 is a rate limit unless its body says the billing quota is
 * exhausted (`insufficient_quota`) — waiting never fixes that one.
 */
export function isOpenAiRateLimited(status: number, body: Buffer): boolean {
  return (
    status === HTTP_TOO_MANY_REQUESTS &&
    !body.toString('utf8').includes(OPENAI_QUOTA_EXHAUSTED_CODE)
  );
}

/**
 * How long to wait before rate-limit retry `retryNumber` (1-based) on the
 * same candidate. The provider's hint wins when it gave one; else 1.5 s,
 * 3 s, 6 s scaled by ±20 % jitter (`random` in [0, 1)). Capped at
 * `SPEECH_RATE_LIMIT_MAX_WAIT_MS`; a hint above the cap returns null — it
 * cannot be honoured, and retrying early only earns a second 429.
 */
export function rateLimitBackoffMs(
  retryNumber: number,
  hintMs: number | null,
  random: number,
): number | null {
  if (hintMs !== null) {
    return hintMs > SPEECH_RATE_LIMIT_MAX_WAIT_MS ? null : hintMs;
  }
  const exponential = SPEECH_RATE_LIMIT_BASE_BACKOFF_MS * 2 ** Math.max(0, retryNumber - 1);
  const jitter = 1 + SPEECH_RATE_LIMIT_JITTER_RATIO * (2 * random - 1);
  return Math.min(SPEECH_RATE_LIMIT_MAX_WAIT_MS, Math.round(exponential * jitter));
}

/** Waits out a rate-limit backoff. */
export function waitMs(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

/** A provider answer the walk retries on the same candidate after a wait. */
export function isSpeechRateLimited(error: unknown): error is SpeechProviderError {
  return error instanceof SpeechProviderError && error.rateLimited;
}
