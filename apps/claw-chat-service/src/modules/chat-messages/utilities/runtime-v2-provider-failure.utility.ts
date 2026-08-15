import {
  RUNTIME_V2_TRANSIENT_PROVIDER_BACKOFF_MS,
  RUNTIME_V2_TRANSIENT_PROVIDER_CODE,
  RUNTIME_V2_TRANSIENT_PROVIDER_STATUSES,
} from '../constants/runtime-v2-failure.constants';

/**
 * Names an upstream failure by whether repeating the request could help.
 *
 * Every non-2xx used to become `CLOUD_PROVIDER_REQUEST_FAILED`, which made a
 * rate limit indistinguishable from a malformed request and left the runtime
 * loop with one option for both: end the run. A 500 arriving mid-task threw
 * away sixteen admitted tools and every file already read.
 */
export function providerFailureCode(status: number): string {
  return RUNTIME_V2_TRANSIENT_PROVIDER_STATUSES.includes(status)
    ? RUNTIME_V2_TRANSIENT_PROVIDER_CODE
    : 'CLOUD_PROVIDER_REQUEST_FAILED';
}

/**
 * Backoff before a transient retry. The last entry repeats past the table so a
 * raised retry count can never index off the end and wait zero milliseconds.
 */
export function transientProviderBackoffMs(attempt: number): number {
  const table = RUNTIME_V2_TRANSIENT_PROVIDER_BACKOFF_MS;
  const index = Math.min(Math.max(attempt, 1), table.length) - 1;
  return table[index] ?? 0;
}

/** Waits out a retry backoff. */
export function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}
