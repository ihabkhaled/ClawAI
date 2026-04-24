import type { RetryPolicyConfig } from '../types/retry-policy.types';

/**
 * Exponential-backoff + jitter retry policy for workspace sync runs.
 *
 * Phase 5 decision: attempts count from 0 (pre-first-retry) → baseMs * 2^attempt.
 * Jitter is additive within [0, jitterMs]. This is "full jitter" per AWS
 * architecture blog — it's the simplest model that avoids synchronized retries.
 */
export function computeBackoffMs(
  attempt: number,
  config: RetryPolicyConfig,
  rand: () => number = Math.random,
): number {
  const safeAttempt = Math.max(0, attempt);
  const exponential = config.baseMs * 2 ** safeAttempt;
  const jitter = Math.floor(rand() * Math.max(0, config.jitterMs));
  return exponential + jitter;
}

export function shouldRetry(attempt: number, config: RetryPolicyConfig): boolean {
  return attempt < config.maxAttempts;
}
