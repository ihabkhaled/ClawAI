/** Why a comparative verdict carries no ranking. Persisted so the UI can say which. */
export enum CompareJudgeFailureReason {
  /** The provider call threw (network, 402, timeout). Nothing was ranked. */
  CALL_FAILED = 'call_failed',
  /** The judge answered, but not in the schema. Its text is not a verdict. */
  PARSE_FAILED = 'parse_failed',
  /** Fewer than two lanes completed, so there was nothing to compare. */
  NOT_ENOUGH_ANSWERS = 'not_enough_answers',
}
