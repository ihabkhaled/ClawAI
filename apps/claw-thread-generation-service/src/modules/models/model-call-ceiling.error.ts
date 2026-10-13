import { MODEL_CALL_CEILING_MESSAGE } from './constants/model-call.constants';
import { DeterministicGenerationError } from '../generation/utilities/deterministic-generation.error';

/**
 * One call ran to its absolute time limit while still working. The same model would do it
 * again and be paid for again, so the same model is not retried: the next candidate is
 * tried, and the job fails on this attempt only when every candidate ended this way.
 */
export class ModelCallCeilingError extends DeterministicGenerationError {
  constructor(message: string = MODEL_CALL_CEILING_MESSAGE) {
    super(message);
    this.name = 'ModelCallCeilingError';
  }
}
