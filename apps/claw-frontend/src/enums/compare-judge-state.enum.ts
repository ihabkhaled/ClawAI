export enum CompareJudgeState {
  NONE = 'none',
  AWAITING = 'awaiting',
  VERIFIED = 'verified',
  REVISED = 'revised',
  ESCALATED = 'escalated',
  FAILED = 'failed',
  UNAVAILABLE = 'unavailable',
  SKIPPED = 'skipped',
  /** Scored side by side with every other lane by the comparative judge (ADR-116). */
  RANKED = 'ranked',
}
