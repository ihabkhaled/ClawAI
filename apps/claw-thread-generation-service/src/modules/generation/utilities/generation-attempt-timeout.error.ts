import { STEP_ATTEMPT_TIMEOUT_MESSAGE } from '../constants/step-recorder.constants';

/** One job attempt used up its whole time budget; a retry resumes from the saved checkpoints. */
export class GenerationAttemptTimeoutError extends Error {
  constructor() {
    super(STEP_ATTEMPT_TIMEOUT_MESSAGE);
    this.name = 'GenerationAttemptTimeoutError';
  }
}
