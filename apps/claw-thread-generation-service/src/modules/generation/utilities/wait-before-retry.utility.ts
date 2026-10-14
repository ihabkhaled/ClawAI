import { abortReasonToError } from './abort-reason-error.utility';

/**
 * Waits `ms` before the next try of a model, and ends at once with the job's own cancel error
 * when the job is cancelled or loses its lease meanwhile, so a backoff never outlives its job.
 */
export function waitBeforeRetry(ms: number, signal: AbortSignal | undefined): Promise<void> {
  if (signal?.aborted) return Promise.reject(abortReasonToError(signal.reason));
  return new Promise<void>((resolve, reject) => {
    const onAbort = (): void => {
      clearTimeout(timer);
      reject(abortReasonToError(signal?.reason));
    };
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort);
      resolve();
    }, ms);
    signal?.addEventListener('abort', onAbort, { once: true });
  });
}
