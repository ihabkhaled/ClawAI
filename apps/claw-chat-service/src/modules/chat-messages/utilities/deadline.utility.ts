import type { DeadlineResult } from '../types/vision-helper.types';

/**
 * Races `promise` against `timeoutMs`. The losing promise is not cancelled —
 * a provider call keeps running and settles its own PAYG hold — but its
 * rejection is observed, so an abandoned call never surfaces as an unhandled
 * rejection.
 */
export async function raceDeadline<T>(
  promise: Promise<T>,
  timeoutMs: number,
): Promise<DeadlineResult<T>> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<DeadlineResult<T>>((resolve) => {
    timer = setTimeout(() => {
      resolve({ timedOut: true });
    }, timeoutMs);
  });
  promise.catch(() => null);
  try {
    return await Promise.race([
      promise.then((value): DeadlineResult<T> => ({ timedOut: false, value })),
      deadline,
    ]);
  } finally {
    clearTimeout(timer);
  }
}
