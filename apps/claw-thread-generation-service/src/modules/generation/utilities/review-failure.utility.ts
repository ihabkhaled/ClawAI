import type { ThreadReviewVerdict } from '@claw/shared-types';

import { REVIEW_STEP_ROLE_KINDS } from '../constants/evidence-gap.constants';
import { MIN_CRITIC_SCORE, MIN_JUDGE_SCORE } from '../constants/generation.constants';
import type { StepRow } from '../types/step-recorder.types';
import { onlyEvidenceGaps } from './classify-blocker.utility';
import { parseVerdict } from './review-verdict.utility';

/**
 * What the newest failed review said: score, minimum and blockers, read from the step log. Null
 * when no review step carries a verdict (an older job, or a job that never reached a review).
 * A score that met the minimum while blockers remained is `blocked`.
 */
export function latestReviewVerdict(steps: readonly StepRow[]): ThreadReviewVerdict | null {
  const newestFirst = [...steps].sort((left, right) => right.seq - left.seq);
  for (const step of newestFirst) {
    const reviewer = REVIEW_STEP_ROLE_KINDS.get(step.roleKind);
    const verdict = step.outcome === 'RETRY' && reviewer ? parseVerdict(step.excerpt) : null;
    if (reviewer && verdict) {
      const minScore = verdict.minScore > 0 ? verdict.minScore : minimumFor(reviewer);
      return {
        reviewer,
        score: verdict.score,
        minScore,
        blockers: verdict.blockers,
        blocked: verdict.score >= minScore && verdict.blockers.length > 0,
      };
    }
  }
  return null;
}

function minimumFor(reviewer: ThreadReviewVerdict['reviewer']): number {
  return reviewer === 'JUDGE' ? MIN_JUDGE_SCORE : MIN_CRITIC_SCORE;
}

/** True when the failed review wanted only sources the pipeline could not supply. */
export function isEvidenceGapFailure(verdict: ThreadReviewVerdict | null): boolean {
  return verdict !== null && onlyEvidenceGaps(verdict.blockers);
}
