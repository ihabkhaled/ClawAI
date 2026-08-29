import { ApiClientError } from '@/services/shared/api-client';
import type { TranslateFunction } from '@/types/i18n.types';

export function resolveBillingErrorMessage(
  error: unknown,
  t: TranslateFunction,
  fallback: string,
): string {
  if (!(error instanceof ApiClientError)) {
    return fallback;
  }

  switch (error.code) {
    case 'PLAN_NOT_PURCHASABLE':
      return t('billing.errors.PLAN_NOT_PURCHASABLE');
    case 'PAYMENT_NOT_VERIFIED':
      return t('billing.errors.PAYMENT_NOT_VERIFIED');
    case 'PAYMENT_METHOD_UNAVAILABLE':
      return t('billing.errors.PAYMENT_METHOD_UNAVAILABLE');
    case 'SUBSCRIPTION_NOT_FOUND':
      return t('billing.errors.SUBSCRIPTION_NOT_FOUND');
    // Pay-as-you-go connector credit. Four codes with four different messages,
    // because collapsing them would tell a user whose balance is fine that they
    // are out of money — and PAYG_PRICING_UNAVAILABLE is OUR outage, so its copy
    // says "temporarily unavailable" and never blames the wallet.
    case 'PAYG_CREDIT_EXHAUSTED':
      return t('billing.errors.PAYG_CREDIT_EXHAUSTED');
    case 'PAYG_PROMPT_TOO_EXPENSIVE':
      return t('billing.errors.PAYG_PROMPT_TOO_EXPENSIVE');
    case 'PAYG_MODEL_UNPRICED':
      return t('billing.errors.PAYG_MODEL_UNPRICED');
    case 'PAYG_PRICING_UNAVAILABLE':
      return t('billing.errors.PAYG_PRICING_UNAVAILABLE');
    case 'CREDIT_PACKAGE_NOT_FOUND':
      return t('billing.errors.CREDIT_PACKAGE_NOT_FOUND');
    case 'CREDIT_PACKAGE_INACTIVE':
      return t('billing.errors.CREDIT_PACKAGE_INACTIVE');
    case 'CREDIT_ADJUSTMENT_REASON_REQUIRED':
      return t('billing.errors.CREDIT_ADJUSTMENT_REASON_REQUIRED');
    default:
      return fallback;
  }
}
