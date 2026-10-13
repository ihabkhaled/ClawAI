import { ServiceUnavailableException } from '@nestjs/common';

import {
  STEP_ERROR_CAUSE_DEPTH,
  STEP_FALLBACK_ERROR_CODE,
} from '../constants/step-recorder.constants';
import type { CandidateOutcome } from '../types/candidate-outcome.types';
import { formatCandidateSummary, pickPrimaryOutcome } from './candidate-summary.utility';

/**
 * Every model candidate of one role failed. Carries the per-candidate outcomes and the primary
 * cause so the job's terminal code names the reason, not whichever fallback failed last. The
 * `cause` is the last underlying error, kept for the deterministic-failure check on the chain.
 */
export class CandidatesExhaustedError extends ServiceUnavailableException {
  readonly outcomes: readonly CandidateOutcome[];
  readonly primary: CandidateOutcome;
  readonly summary: string;

  constructor(outcomes: readonly CandidateOutcome[], cause: Error) {
    const primary = pickPrimaryOutcome(outcomes) ?? {
      provider: '',
      model: '',
      code: STEP_FALLBACK_ERROR_CODE,
      httpStatus: null,
    };
    const summary = formatCandidateSummary(outcomes, primary);
    super(summary, { cause });
    this.name = 'CandidatesExhaustedError';
    this.outcomes = outcomes;
    this.primary = primary;
    this.summary = summary;
  }
}

/** The exhausted-candidates error on this error's cause chain, if any. */
export function findCandidatesExhausted(error: unknown): CandidatesExhaustedError | undefined {
  let current: unknown = error;
  for (let depth = 0; depth < STEP_ERROR_CAUSE_DEPTH && current instanceof Error; depth += 1) {
    if (current instanceof CandidatesExhaustedError) return current;
    current = current.cause;
  }
  return undefined;
}
