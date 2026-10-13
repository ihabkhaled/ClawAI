import { GenerationAttemptTimeoutError } from './generation-attempt-timeout.error';
import { ThreadGenerationCancelledError } from './thread-generation-cancelled.error';
import { ThreadGenerationLeaseLostError } from './thread-generation-lease-lost.error';

/**
 * The error a job-level abort stands for. The job aborts with its own error (cancelled,
 * lease lost, attempt ceiling); anything else, such as the default `AbortError`, is a cancel.
 */
export function abortReasonToError(reason: unknown): Error {
  return reason instanceof GenerationAttemptTimeoutError ||
    reason instanceof ThreadGenerationLeaseLostError ||
    reason instanceof ThreadGenerationCancelledError
    ? reason
    : new ThreadGenerationCancelledError();
}
