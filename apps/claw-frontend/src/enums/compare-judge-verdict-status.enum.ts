/**
 * Outcome of Compare's one comparative judge call. Mirrors chat-service's
 * `CompareJudgeVerdictStatus` (ADR-116). Only RANKED carries scores; the other
 * two never name a winner.
 */
export enum CompareJudgeVerdictStatus {
  RANKED = 'ranked',
  UNAVAILABLE = 'unavailable',
  SKIPPED = 'skipped',
}
