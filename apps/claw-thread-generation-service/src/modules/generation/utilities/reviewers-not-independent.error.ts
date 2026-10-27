import { REVIEWERS_NOT_INDEPENDENT_MESSAGE } from '../constants/healing.constants';
import { DeterministicGenerationError } from './deterministic-generation.error';

/**
 * Every model left for the Critic is the one that answered the Judge, so the two reviews would
 * not be independent. Deterministic: the same pool gives the same answer, so the job ends here
 * with a not-passed review the owner can retry with other models (fail closed). It carries no
 * cause on purpose: the earlier provider failure would otherwise replace its own code.
 */
export class ReviewersNotIndependentError extends DeterministicGenerationError {
  constructor() {
    super(REVIEWERS_NOT_INDEPENDENT_MESSAGE);
    this.name = 'ReviewersNotIndependentError';
  }
}
