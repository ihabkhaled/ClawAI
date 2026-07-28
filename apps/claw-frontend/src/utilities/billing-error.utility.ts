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
    default:
      return fallback;
  }
}
