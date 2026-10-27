import {
  CRITIC_BLOCKED_CODE,
  JUDGE_BLOCKED_CODE,
  VERDICT_BLOCKER_MAX_CHARS,
  VERDICT_MAX_BLOCKERS,
} from '../constants/evidence-gap.constants';
import { type ReviewVerdictRecord, reviewVerdictRecordSchema } from '../types/evidence-gap.types';
import type { StructuredReview } from '../types/generation-pipeline.types';
import { clampReviewText } from './clamp-review-text.utility';

/**
 * The compact record a failed review leaves in the step log: score, minimum and the blocker
 * texts as given, each shortened. The panel reads it back to say why the review failed.
 */
export function serializeVerdict(
  review: Pick<StructuredReview, 'score' | 'blockers'>,
  minScore: number,
): string {
  const record: ReviewVerdictRecord = {
    score: review.score,
    minScore,
    blockers: review.blockers
      .slice(0, VERDICT_MAX_BLOCKERS)
      .map((blocker) => clampReviewText(blocker, VERDICT_BLOCKER_MAX_CHARS)),
  };
  return JSON.stringify(record);
}

/** The verdict a step excerpt holds, or null for anything else (older steps, other roles). */
export function parseVerdict(excerpt: string | null): ReviewVerdictRecord | null {
  if (excerpt === null) return null;
  try {
    const parsed = reviewVerdictRecordSchema.safeParse(JSON.parse(excerpt));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

/** The step code of a review of this role that failed on its blockers alone. */
export function blockedReviewCode(reviewer: 'JUDGE' | 'CRITIC'): string {
  return reviewer === 'JUDGE' ? JUDGE_BLOCKED_CODE : CRITIC_BLOCKED_CODE;
}
