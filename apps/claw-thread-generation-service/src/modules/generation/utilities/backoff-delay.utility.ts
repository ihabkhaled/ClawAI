import {
  HEAL_BACKOFF_BASE_MS,
  HEAL_BACKOFF_MAX_MS,
  HEAL_JITTER_RATIO,
  HEAL_RETRY_AFTER_MAX_MS,
} from '../constants/healing.constants';

/**
 * Milliseconds to wait before the next try of the same model: exponential from the base with
 * jitter so parallel authors do not hit a rate limit together. A provider's Retry-After wins
 * when it is within the limit (`null` is returned for a longer one: use another model instead).
 * `random` is injected so the result is testable.
 */
export function backoffDelayMs(
  waits: number,
  retryAfterMs: number | null,
  random: () => number = Math.random,
): number | null {
  if (retryAfterMs !== null) {
    return retryAfterMs > HEAL_RETRY_AFTER_MAX_MS ? null : Math.max(0, retryAfterMs);
  }
  const exponential = Math.min(HEAL_BACKOFF_BASE_MS * 2 ** Math.max(0, waits), HEAL_BACKOFF_MAX_MS);
  const jitter = exponential * HEAL_JITTER_RATIO * (random() * 2 - 1);
  return Math.max(0, Math.round(exponential + jitter));
}
