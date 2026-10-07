/** Why a credit model was not used and an included model answered instead. */
export enum CreditFallbackReason {
  CREDIT_EXHAUSTED = 'CREDIT_EXHAUSTED',
  FREE_ALLOWANCE_EXHAUSTED = 'FREE_ALLOWANCE_EXHAUSTED',
  PROMPT_TOO_EXPENSIVE = 'PROMPT_TOO_EXPENSIVE',
}
