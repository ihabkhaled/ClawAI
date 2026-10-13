import type {
  ModelCallAbortCause,
  ModelCallGuard,
  ModelCallGuardOptions,
} from '../types/model-call.types';

/**
 * One abort signal for one model call, fed by three sources: silence (restarted by
 * `touch()`), an absolute ceiling that nothing restarts, and the job's cancellation
 * signal. The first to fire wins and `cause()` says which, so the caller can tell a
 * stuck model from a cancelled job.
 */
export function createModelCallGuard(options: ModelCallGuardOptions): ModelCallGuard {
  const controller = new AbortController();
  let cause: ModelCallAbortCause | null = null;
  let idleEnabled = true;
  let idleTimer: ReturnType<typeof setTimeout> | undefined;

  const abort = (next: ModelCallAbortCause, reason: unknown): void => {
    if (cause !== null) return;
    cause = next;
    controller.abort(reason);
  };
  const stopIdle = (): void => {
    if (idleTimer !== undefined) clearTimeout(idleTimer);
    idleTimer = undefined;
  };
  const touch = (): void => {
    if (!idleEnabled || cause !== null) return;
    stopIdle();
    idleTimer = setTimeout(() => {
      abort('idle', new Error('model call idle'));
    }, options.idleMs);
  };
  const ceilingTimer = setTimeout(() => {
    abort('ceiling', new Error('model call ceiling'));
  }, options.maxMs);
  const onCancel = (): void => {
    abort('cancelled', options.cancelSignal?.reason);
  };

  if (options.cancelSignal?.aborted) onCancel();
  else options.cancelSignal?.addEventListener('abort', onCancel, { once: true });
  touch();

  return {
    signal: controller.signal,
    touch,
    disableIdle: () => {
      idleEnabled = false;
      stopIdle();
    },
    cause: () => cause,
    dispose: () => {
      stopIdle();
      clearTimeout(ceilingTimer);
      options.cancelSignal?.removeEventListener('abort', onCancel);
    },
  };
}
