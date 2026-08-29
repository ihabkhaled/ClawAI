import {
  isCreditTopupCheckoutSession,
  isPayableCheckoutSession,
  isSubscriptionCheckoutSession,
} from '../checkout-session-purpose.utility';
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
  creditPackageId: null,
  creditPackageVersionId: null,
  creditMicroUsd: null,
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

// A CREDIT_TOPUP row as the database CHECK constrains it: money, no plan.
const topupSession = (overrides: Partial<CheckoutSession> = {}): CheckoutSession =>
  session({
    purpose: CheckoutSessionPurpose.CREDIT_TOPUP,
    planId: null,
    planSlug: null,
    planPriceVersionId: null,
    billingInterval: null,
    baseAmountMinor: 2_500,
    baseCurrency: 'USD',
    chargeAmountMinor: 2_500,
    chargeCurrency: 'USD',
    creditPackageId: 'pkg-25',
    creditPackageVersionId: 'cpv-9',
    creditMicroUsd: 15_000_000n,
    ...overrides,
  });

describe('isSubscriptionCheckoutSession — with CREDIT_TOPUP present', () => {
  it('still rejects a credit top-up, because its plan fields are null', () => {
    // This is the property that let the top-up branch be ADDED rather than the
    // existing predicate LOOSENED: every one of its callers keeps its exact
    // behaviour, and a top-up can never reach the subscription activation path.
    expect(isSubscriptionCheckoutSession(topupSession())).toBe(false);
  });
});

describe('isCreditTopupCheckoutSession', () => {
  it('accepts a complete credit top-up session', () => {
    expect(isCreditTopupCheckoutSession(topupSession())).toBe(true);
  });

  it('rejects a subscription session', () => {
    expect(isCreditTopupCheckoutSession(session())).toBe(false);
  });

  it.each([
    ['creditPackageId', { creditPackageId: null }],
    ['creditPackageVersionId', { creditPackageVersionId: null }],
    ['creditMicroUsd', { creditMicroUsd: null }],
    ['chargeAmountMinor', { chargeAmountMinor: null }],
  ])('fails closed when %s is absent', (_label, overrides) => {
    // Positive, not "not a subscription": a half-written row must be refused,
    // never treated as a purchase of an unknown amount of credit.
    expect(isCreditTopupCheckoutSession(topupSession(overrides))).toBe(false);
  });

  it('rejects a PAYMENT_METHOD_SETUP row even if credit fields were somehow set', () => {
    expect(
      isCreditTopupCheckoutSession(
        topupSession({ purpose: CheckoutSessionPurpose.PAYMENT_METHOD_SETUP }),
      ),
    ).toBe(false);
  });
});

describe('isPayableCheckoutSession', () => {
  it('accepts both purchase kinds', () => {
    expect(isPayableCheckoutSession(session())).toBe(true);
    expect(isPayableCheckoutSession(topupSession())).toBe(true);
  });

  it('rejects a card-vaulting setup despite its verification amount', () => {
    // A setup session DOES carry an amount, so the purpose check — not the
    // amount — is what keeps it out of every purchase path.
    expect(
      isPayableCheckoutSession(
        session({
          purpose: CheckoutSessionPurpose.PAYMENT_METHOD_SETUP,
          planId: null,
          planSlug: null,
          planPriceVersionId: null,
          billingInterval: null,
          paymentMethodConsentedAt: new Date('2026-07-27T00:00:00.000Z'),
        }),
      ),
    ).toBe(false);
  });
});
