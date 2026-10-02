import {
  HTTP_TOO_MANY_REQUESTS,
  RATE_LIMIT_COPY_KEYS,
  SECONDS_PER_MINUTE,
} from '@/constants/rate-limit.constants';
import { ApiErrorCode } from '@/enums/api-error-code.enum';
import type { TranslateFunction } from '@/types';
import type { RateLimitMessage } from '@/types/rate-limit.types';

/**
 * A `Retry-After` header value as whole seconds, or undefined.
 *
 * Accepts delta-seconds (what ClawAI sends) and the HTTP-date form, which a
 * proxy may substitute. Anything else is ignored rather than guessed.
 */
export function parseRetryAfterSeconds(
  raw: unknown,
  nowMs: number = Date.now(),
): number | undefined {
  if (typeof raw === 'number') {
    return Number.isFinite(raw) && raw >= 0 ? Math.ceil(raw) : undefined;
  }
  if (typeof raw !== 'string' || raw.trim().length === 0) {
    return undefined;
  }
  const trimmed = raw.trim();
  if (/^\d+$/u.test(trimmed)) {
    return Number(trimmed);
  }
  const dateMs = Date.parse(trimmed);
  return Number.isNaN(dateMs) ? undefined : Math.max(0, Math.ceil((dateMs - nowMs) / 1_000));
}

function readField(error: unknown, field: string): unknown {
  return error !== null && typeof error === 'object' && field in error
    ? (error as Record<string, unknown>)[field]
    : undefined;
}

/**
 * True for the sign-in / sign-up limiter's refusal: code RATE_LIMITED, or a
 * bare 429 with no code (nginx's limit_req). A 429 that carries ANOTHER code
 * (a daily email-change cap, say) is that code's business, not this one.
 */
export function isRateLimitedError(error: unknown): boolean {
  const code = readField(error, 'code');
  if (code === ApiErrorCode.RATE_LIMITED) {
    return true;
  }
  return readField(error, 'status') === HTTP_TOO_MANY_REQUESTS && code === undefined;
}

/** The server's Retry-After in seconds, when the error carried one. */
export function readRetryAfterSeconds(error: unknown): number | null {
  const value = readField(error, 'retryAfterSeconds');
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : null;
}

/**
 * "Try again in N minutes", rounded UP so the user never retries early and
 * is refused again. No header: the existing generic "wait, then try again".
 */
export function resolveRateLimitMessage(retryAfterSeconds: number | null): RateLimitMessage {
  if (retryAfterSeconds === null) {
    return { key: RATE_LIMIT_COPY_KEYS.fallback };
  }
  const minutes = Math.max(1, Math.ceil(retryAfterSeconds / SECONDS_PER_MINUTE));
  return minutes === 1
    ? { key: RATE_LIMIT_COPY_KEYS.inOneMinute }
    : { key: RATE_LIMIT_COPY_KEYS.inMinutes, params: { minutes } };
}

/** The translated refusal for a rate-limited error, or null for any other error. */
export function translateRateLimitError(error: unknown, t: TranslateFunction): string | null {
  if (!isRateLimitedError(error)) {
    return null;
  }
  const message = resolveRateLimitMessage(readRetryAfterSeconds(error));
  return t(message.key, message.params);
}
