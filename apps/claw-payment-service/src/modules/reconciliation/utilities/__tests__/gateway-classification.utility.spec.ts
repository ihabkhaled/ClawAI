import { ReconciliationClassification } from '../../../../common/enums/reconciliation.enum';
import {
  classifyPaymobMismatch,
  classifyPaymobResult,
  classifyPaypalMismatch,
  classifyPaypalResult,
} from '../gateway-classification.utility';

describe('gateway classification', () => {
  it.each([
    ['AMOUNT_MISMATCH', ReconciliationClassification.AMOUNT_MISMATCH],
    ['CURRENCY_MISMATCH', ReconciliationClassification.CURRENCY_MISMATCH],
    ['SESSION_MISMATCH', ReconciliationClassification.SESSION_MISMATCH],
    ['NO_CAPTURE', ReconciliationClassification.LOCAL_PENDING_PROVIDER_PENDING],
    ['NOT_TERMINAL', ReconciliationClassification.LOCAL_PENDING_PROVIDER_PENDING],
  ] as const)('classifies PayPal %s', (reason, expected) => {
    expect(classifyPaypalMismatch(reason)).toBe(expected);
  });

  it.each([
    ['AMOUNT_MISMATCH', ReconciliationClassification.AMOUNT_MISMATCH],
    ['CURRENCY_MISMATCH', ReconciliationClassification.CURRENCY_MISMATCH],
    ['SESSION_MISMATCH', ReconciliationClassification.SESSION_MISMATCH],
    ['REVERSED', ReconciliationClassification.PAYMENT_REVERSED],
    ['PENDING', ReconciliationClassification.LOCAL_PENDING_PROVIDER_PENDING],
    ['HMAC_INVALID', ReconciliationClassification.PAYMENT_FAILED],
    ['NOT_SUCCESSFUL', ReconciliationClassification.PAYMENT_FAILED],
  ] as const)('classifies Paymob %s', (reason, expected) => {
    expect(classifyPaymobMismatch(reason)).toBe(expected);
  });

  it('marks a fully verified PayPal capture repairable', () => {
    expect(
      classifyPaypalResult({
        verified: true,
        captureId: 'capture-1',
        status: 'COMPLETED',
        amountMinor: 2000,
        currency: 'USD',
        checkoutSessionId: 'checkout-1',
        mismatchReason: null,
      }),
    ).toEqual({
      classification: ReconciliationClassification.LOCAL_PENDING_PROVIDER_PAID,
      providerStatus: 'COMPLETED',
      repairable: true,
      providerTransactionId: 'capture-1',
      amountMinor: 2000,
      currency: 'USD',
    });
  });

  it('marks a fully verified Paymob transaction repairable', () => {
    expect(
      classifyPaymobResult({
        verified: true,
        transactionId: 'transaction-1',
        amountMinor: 100_00,
        currency: 'EGP',
        checkoutSessionId: 'checkout-1',
        mismatchReason: null,
      }),
    ).toMatchObject({
      classification: ReconciliationClassification.LOCAL_PENDING_PROVIDER_PAID,
      repairable: true,
      providerTransactionId: 'transaction-1',
    });
  });
});
