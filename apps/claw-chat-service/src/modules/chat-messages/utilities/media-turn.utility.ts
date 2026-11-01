import type { MediaFinalStepManager } from '../managers/media-final-step.manager';

/** Runs an orchestrated turn under the thread's Stop key when the media step is wired. */
export function runInMediaTurn<T>(
  manager: MediaFinalStepManager | undefined,
  threadId: string,
  work: () => Promise<T>,
): Promise<T> {
  return manager === undefined ? work() : manager.runScoped(threadId, work);
}
