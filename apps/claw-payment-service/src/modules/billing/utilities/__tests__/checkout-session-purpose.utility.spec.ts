import { isSubscriptionCheckoutSession } from '../checkout-session-purpose.utility';
import { type CheckoutSession, CheckoutSessionPurpose } from '../../../../generated/prisma';

const session = (overrides: Partial<CheckoutSession> = {}): CheckoutSession => ({
  id: 'session-1',
  userId: 'user-1',
  billingEmail: null,
  purpose: CheckoutSessionPurpose.NEW_SUBSCRIPTION,
  status: 'CREATED',
  gateway: 'PAYMOB',
  planId: 'plan-1',
  planSlug: 'pro',
  planPriceVersionId: 'price-1',
  billingInterval: 'MONTHLY',
  baseAmountMinor: 1_000,
  baseCurrency: 'USD',
  chargeAmountMinor: 50_000,
  chargeCurrency: 'EGP',
  fxQuoteId: null,
  fxFinalRateScaled: null,
  idempotencyKey: 'idempotency-1',
  stateNonce: 'nonce',
  paymentMethodConsentedAt: null,
  providerOrderId: null,
  hostedCheckoutUrl: null,
  subscriptionId: null,
  prorationQuoteId: null,
  expiresAt: new Date('2026-07-28T00:00:00.000Z'),
  verifiedAt: null,
  completedAt: null,
  failureCode: null,
  createdAt: new Date('2026-07-27T00:00:00.000Z'),
  updatedAt: new Date('2026-07-27T00:00:00.000Z'),
  ...overrides,
});

describe('isSubscriptionCheckoutSession', () => {
  it('accepts a complete subscription session', () => {
    expect(isSubscriptionCheckoutSession(session())).toBe(true);
  });

  it('rejects a setup session with no money or plan fields', () => {
    expect(
      isSubscriptionCheckoutSession(
        session({
          purpose: CheckoutSessionPurpose.PAYMENT_METHOD_SETUP,
          planId: null,
          planSlug: null,
          planPriceVersionId: null,
          billingInterval: null,
          baseAmountMinor: null,
          baseCurrency: null,
          chargeAmountMinor: null,
          chargeCurrency: null,
          paymentMethodConsentedAt: new Date('2026-07-27T00:00:00.000Z'),
        }),
      ),
    ).toBe(false);
  });

  it('fails closed when a subscription field is unexpectedly absent', () => {
    expect(isSubscriptionCheckoutSession(session({ chargeCurrency: null }))).toBe(false);
  });
});
