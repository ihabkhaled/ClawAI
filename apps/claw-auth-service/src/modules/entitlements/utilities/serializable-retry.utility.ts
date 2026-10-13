import { setTimeout as delay } from 'node:timers/promises';

import {
  PRISMA_SERIALIZATION_FAILURE_CODE,
  THREAD_BUDGET_TX_BASE_DELAY_MS,
  THREAD_BUDGET_TX_MAX_ATTEMPTS,
  THREAD_BUDGET_TX_MAX_DELAY_MS,
} from '../constants/thread-job-budget-retry.constants';
import { type RetryOptions } from '../types/thread-job-budget.types';

/** Thrown when every bounded attempt lost the race. Transient, never a refusal. */
export class SerializationRetryExhaustedError extends Error {
  constructor(
    public readonly attempts: number,
    public readonly lastError: unknown,
  ) {
    super(`transaction still conflicting after ${String(attempts)} attempts`);
    this.name = 'SerializationRetryExhaustedError';
  }
}

function readCode(error: unknown): string | null {
  if (typeof error !== 'object' || error === null || !('code' in error)) {
    return null;
  }
  const { code } = error;
  return typeof code === 'string' ? code : null;
}

/** True for a serialization failure (Prisma P2034) or one of the caller's extra codes. */
export function isRetryableTransactionError(
  error: unknown,
  extraCodes: readonly string[] = [],
): boolean {
  const code = readCode(error);
  return code !== null && (code === PRISMA_SERIALIZATION_FAILURE_CODE || extraCodes.includes(code));
}

/** Full-jitter delay: a random point in [1, min(max, base * 2^(attempt-1))] ms. */
export function jitteredDelayMs(
  attempt: number,
  baseDelayMs: number,
  maxDelayMs: number,
  random: () => number,
): number {
  const ceiling = Math.min(maxDelayMs, baseDelayMs * 2 ** Math.max(0, attempt - 1));
  return Math.max(1, Math.floor(random() * ceiling) + 1);
}

/**
 * Runs `work` again when it loses a serialization race, a bounded number of
 * times with jittered backoff. Any other error is rethrown at once; running out
 * of attempts throws {@link SerializationRetryExhaustedError} so the caller can
 * tell "busy" from "refused".
 */
export async function retryOnSerializationFailure<T>(
  work: () => Promise<T>,
  options: RetryOptions = {},
): Promise<T> {
  const maxAttempts = options.maxAttempts ?? THREAD_BUDGET_TX_MAX_ATTEMPTS;
  const baseDelayMs = options.baseDelayMs ?? THREAD_BUDGET_TX_BASE_DELAY_MS;
  const maxDelayMs = options.maxDelayMs ?? THREAD_BUDGET_TX_MAX_DELAY_MS;
  const random = options.random ?? Math.random;
  const sleep =
    options.sleep ??
    (async (ms: number): Promise<void> => {
      await delay(ms);
    });
  let lastError: unknown = null;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      return await work();
    } catch (error) {
      if (!isRetryableTransactionError(error, options.extraCodes)) {
        throw error;
      }
      lastError = error;
      if (attempt < maxAttempts) {
        await sleep(jitteredDelayMs(attempt, baseDelayMs, maxDelayMs, random));
      }
    }
  }
  throw new SerializationRetryExhaustedError(maxAttempts, lastError);
}
