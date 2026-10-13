import { ServiceUnavailableException } from '@nestjs/common';

import { STEP_ERROR_CAUSE_DEPTH } from '../constants/step-recorder.constants';

/**
 * A failure that a retry cannot fix: the prompt does not fit any candidate, a role
 * configuration is invalid, or the model catalog rejected the lookup. The job fails on
 * the first attempt with the real reason instead of repeating the same call.
 */
export class DeterministicGenerationError extends ServiceUnavailableException {
  constructor(message: string) {
    super(message);
    this.name = 'DeterministicGenerationError';
  }
}

/** True when the error, or anything in its cause chain, is a deterministic failure. */
export function isDeterministicGenerationError(error: unknown): boolean {
  let current: unknown = error;
  for (let depth = 0; depth < STEP_ERROR_CAUSE_DEPTH && current instanceof Error; depth += 1) {
    if (current instanceof DeterministicGenerationError) return true;
    current = current.cause;
  }
  return false;
}
