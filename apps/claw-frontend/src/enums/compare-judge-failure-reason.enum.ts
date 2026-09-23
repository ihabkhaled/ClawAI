/** Why a comparative verdict has no ranking. Mirrors chat-service (ADR-116). */
export enum CompareJudgeFailureReason {
  CALL_FAILED = 'call_failed',
  PARSE_FAILED = 'parse_failed',
  NOT_ENOUGH_ANSWERS = 'not_enough_answers',
}
