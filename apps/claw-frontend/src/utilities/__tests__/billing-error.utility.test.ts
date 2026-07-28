import { describe, expect, it } from 'vitest';

import { ApiClientError } from '@/services/shared/api-client';
import { resolveBillingErrorMessage } from '@/utilities/billing-error.utility';

const t = (key: string): string => `translated:${key}`;

describe('resolveBillingErrorMessage', () => {
  it.each([
    'PLAN_NOT_PURCHASABLE',
    'PAYMENT_NOT_VERIFIED',
    'PAYMENT_METHOD_UNAVAILABLE',
    'SUBSCRIPTION_NOT_FOUND',
  ])('translates the public billing code %s', (code) => {
    const error = new ApiClientError({
      status: 400,
      code,
      message: `billing.errors.${code}`,
    });

    expect(resolveBillingErrorMessage(error, t, 'fallback')).toBe(
      `translated:billing.errors.${code}`,
    );
  });

  it('does not expose an unknown server message', () => {
    const error = new ApiClientError({
      status: 400,
      code: 'UNKNOWN_BILLING_CODE',
      message: 'provider payload that must not reach the UI',
    });

    expect(resolveBillingErrorMessage(error, t, 'fallback')).toBe('fallback');
  });
});
