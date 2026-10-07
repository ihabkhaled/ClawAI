/** Why a credit model was not used and an included model answered instead. */
export enum CreditFallbackReason {
  CREDIT_EXHAUSTED = 'CREDIT_EXHAUSTED',
  FREE_ALLOWANCE_EXHAUSTED = 'FREE_ALLOWANCE_EXHAUSTED',
  PROMPT_TOO_EXPENSIVE = 'PROMPT_TOO_EXPENSIVE',
  MODEL_NOT_IN_FREE_ALLOWANCE = 'MODEL_NOT_IN_FREE_ALLOWANCE',
}
