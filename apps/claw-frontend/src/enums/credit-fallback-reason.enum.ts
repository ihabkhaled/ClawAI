// Mirrors chat-service CreditFallbackReason: why a credit model was not used.
export enum CreditFallbackReason {
  CreditExhausted = 'CREDIT_EXHAUSTED',
  FreeAllowanceExhausted = 'FREE_ALLOWANCE_EXHAUSTED',
  PromptTooExpensive = 'PROMPT_TOO_EXPENSIVE',
}
