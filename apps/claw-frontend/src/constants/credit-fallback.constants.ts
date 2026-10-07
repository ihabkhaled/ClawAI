import { CreditFallbackReason } from '@/enums/credit-fallback-reason.enum';

/** The translation key for the sentence each reason shows. */
export const CREDIT_FALLBACK_REASON_KEYS: Record<CreditFallbackReason, string> = {
  [CreditFallbackReason.CreditExhausted]: 'creditFallback.creditExhausted',
  [CreditFallbackReason.FreeAllowanceExhausted]: 'creditFallback.freeAllowanceExhausted',
  [CreditFallbackReason.PromptTooExpensive]: 'creditFallback.promptTooExpensive',
};
