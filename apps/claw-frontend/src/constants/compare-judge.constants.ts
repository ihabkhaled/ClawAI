import { CompareJudgeFailureReason, CompareJudgeVerdictStatus } from '@/enums';

/** Accepted values when reading a stored verdict back out of message metadata. */
export const COMPARE_JUDGE_VERDICT_STATUSES: ReadonlySet<string> = new Set<string>(
  Object.values(CompareJudgeVerdictStatus),
);
export const COMPARE_JUDGE_FAILURE_REASONS: ReadonlySet<string> = new Set<string>(
  Object.values(CompareJudgeFailureReason),
);

/**
 * What the ranking panel says when the comparative judge produced no ranking
 * (ADR-116). Each reason gets its own sentence: "could not be reached" and
 * "answered in a shape we could not read" are different problems for the user.
 */
export const COMPARE_JUDGE_NOTICE_KEYS: Readonly<Record<CompareJudgeFailureReason, string>> = {
  [CompareJudgeFailureReason.CALL_FAILED]: 'compare.ranking.callFailed',
  [CompareJudgeFailureReason.PARSE_FAILED]: 'compare.ranking.unavailable',
  [CompareJudgeFailureReason.NOT_ENOUGH_ANSWERS]: 'compare.ranking.notEnough',
};

/** Used when a stored verdict has no ranking and no recognisable reason. */
export const COMPARE_JUDGE_FALLBACK_NOTICE_KEY = 'compare.ranking.unavailable';
