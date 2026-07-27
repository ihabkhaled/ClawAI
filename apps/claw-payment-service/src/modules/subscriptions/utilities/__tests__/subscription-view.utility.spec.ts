import { SubscriptionStatus } from '@claw/shared-types';

import {
  toCurrentSubscriptionView,
  toInvoiceView,
  toPaymentMethodView,
  toProrationQuoteResponse,
} from '../subscription-view.utility';
import type { Invoice, PaymentMethod, Subscription } from '../../../../generated/prisma';

const SUBSCRIPTION = {
  id: 'sub-1',
  userId: 'user-1',
  billingCustomerId: 'bc-1',
  planId: 'plan-pro',
  planSlug: 'pro',
  planPriceVersionId: 'ppv-1',
  gateway: 'PAYPAL',
  // Secrets that must never reach a browser.
  encryptedGatewaySubscriptionId: 'ENCRYPTED-CIPHERTEXT-VALUE',
  encryptionKeyVersion: 1,
  gatewaySubscriptionLookupHash: 'BLIND-INDEX-VALUE',
  status: SubscriptionStatus.ACTIVE,
  billingInterval: 'MONTHLY',
  currency: 'USD',
  amountMinor: 1999,
  currentPeriodStart: new Date('2026-07-01T00:00:00.000Z'),
  currentPeriodEnd: new Date('2026-08-01T00:00:00.000Z'),
  cancelAtPeriodEnd: false,
  cancelledAt: null,
  pastDueAt: null,
  gracePeriodEndsAt: null,
  entitlementValidUntil: new Date('2026-08-04T00:00:00.000Z'),
  scheduledPlanId: null,
  scheduledPlanSlug: null,
  scheduledPlanPriceVersionId: null,
  scheduledEffectiveAt: null,
  version: 7,
  uniqueActiveKey: 'user-1',
  createdAt: new Date('2026-07-01T00:00:00.000Z'),
  updatedAt: new Date('2026-07-01T00:00:00.000Z'),
} as unknown as Subscription;

describe('toCurrentSubscriptionView', () => {
  it('never publishes the encrypted gateway id or its blind index', () => {
    // A spread would have leaked all three of these, and would keep leaking
    // every column added to the model in future.
    const view = toCurrentSubscriptionView(SUBSCRIPTION, 'Pro');
    const serialized = JSON.stringify(view);

    expect(serialized).not.toContain('ENCRYPTED-CIPHERTEXT-VALUE');
    expect(serialized).not.toContain('BLIND-INDEX-VALUE');
    expect(Object.keys(view)).not.toContain('version');
    expect(Object.keys(view)).not.toContain('uniqueActiveKey');
  });

  it('serialises dates as ISO strings', () => {
    const view = toCurrentSubscriptionView(SUBSCRIPTION, 'Pro');

    // The frontend does `new Date(currentPeriodEnd)`. A Date object that
    // survived JSON as something else would render "Invalid Date".
    expect(view.currentPeriodEnd).toBe('2026-08-01T00:00:00.000Z');
    expect(view.gracePeriodEndsAt).toBeNull();
  });

  it('falls back to the slug when the plan name is unavailable', () => {
    // The name lives in auth-service. A failure there must not blank the
    // billing page.
    expect(toCurrentSubscriptionView(SUBSCRIPTION, null).planName).toBe('pro');
  });

  it('keeps the amount as an integer minor unit', () => {
    expect(toCurrentSubscriptionView(SUBSCRIPTION, 'Pro').amountMinor).toBe(1999);
  });
});

describe('toPaymentMethodView', () => {
  const METHOD = {
    id: 'pm-1',
    userId: 'user-1',
    billingCustomerId: 'bc-1',
    gateway: 'PAYPAL',
    encryptedToken: 'VAULTED-TOKEN-CIPHERTEXT',
    encryptionKeyVersion: 2,
    tokenBlindIndex: 'TOKEN-BLIND-INDEX',
    type: 'CARD',
    brand: 'Visa',
    last4: '4242',
    expiryMonth: 4,
    expiryYear: 2030,
    status: 'ACTIVE',
    isDefault: true,
    consentedAt: new Date('2026-07-01T00:00:00.000Z'),
    createdAt: new Date('2026-07-01T00:00:00.000Z'),
    updatedAt: new Date('2026-07-01T00:00:00.000Z'),
    deletedAt: null,
  } as unknown as PaymentMethod;

  it('never publishes the vaulted token or its blind index', () => {
    // Shipping the ciphertext would defeat the point of encrypting it at the
    // application layer at all.
    const serialized = JSON.stringify(toPaymentMethodView(METHOD));

    expect(serialized).not.toContain('VAULTED-TOKEN-CIPHERTEXT');
    expect(serialized).not.toContain('TOKEN-BLIND-INDEX');
  });

  it('exposes masked metadata only', () => {
    const view = toPaymentMethodView(METHOD);

    expect(view).toEqual({
      id: 'pm-1',
      gateway: 'PAYPAL',
      brand: 'Visa',
      last4: '4242',
      expiryMonth: 4,
      expiryYear: 2030,
      isDefault: true,
    });
    // last4 is the maximum PAN fragment permitted anywhere in this system.
    expect(view.last4?.length).toBeLessThanOrEqual(4);
  });
});

describe('toInvoiceView', () => {
  it('serialises an unpaid invoice with a null paidAt', () => {
    const invoice = {
      id: 'inv-1',
      number: 'CLAW-000123',
      userId: 'user-1',
      status: 'OPEN',
      currency: 'USD',
      totalMinor: 1999,
      issuedAt: new Date('2026-07-01T00:00:00.000Z'),
      paidAt: null,
    } as unknown as Invoice;

    expect(toInvoiceView(invoice)).toEqual({
      id: 'inv-1',
      number: 'CLAW-000123',
      status: 'OPEN',
      currency: 'USD',
      totalMinor: 1999,
      issuedAt: '2026-07-01T00:00:00.000Z',
      paidAt: null,
      hostedInvoiceUrl: null,
    });
  });
});

describe('toProrationQuoteResponse', () => {
  it('converts millisecond timestamps to ISO strings', () => {
    const response = toProrationQuoteResponse({
      quoteId: 'q-1',
      subscriptionId: 'sub-1',
      targetPlanId: 'plan-pro',
      targetPlanSlug: 'pro',
      targetPriceVersionId: 'ppv-1',
      targetAmountMinor: 2000,
      targetBillingInterval: 'MONTHLY',
      currency: 'USD',
      remainingRatioScaled: 5_000_000,
      unusedCurrentCreditMinor: 500,
      targetRemainingChargeMinor: 1000,
      amountDueMinor: 500,
      isScheduledForPeriodEnd: false,
      scheduledEffectiveAtMs: null,
      expiresAtMs: Date.parse('2026-07-26T00:15:00.000Z'),
    });

    expect(response.expiresAt).toBe('2026-07-26T00:15:00.000Z');
    expect(response.scheduledEffectiveAt).toBeNull();
    // The internal scaled ratio is not something a browser needs.
    expect(Object.keys(response)).not.toContain('remainingRatioScaled');
  });
});
