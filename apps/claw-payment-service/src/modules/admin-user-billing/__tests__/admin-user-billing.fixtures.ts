import { BillingInterval, InvoiceStatus, SubscriptionStatus } from '@claw/shared-types';

import { type Invoice, type Subscription } from '../../../generated/prisma';

// Complete rows, so a fixture never needs a cast to stand in for a Prisma
// model. Overrides are applied last and are therefore what each test is about.

export function buildSubscription(overrides: Partial<Subscription> = {}): Subscription {
  return {
    id: 'sub_1',
    userId: 'user_1',
    billingCustomerId: 'bc_1',
    planId: 'plan_1',
    planSlug: 'starter',
    planPriceVersionId: 'pv_1',
    gateway: 'PAYPAL',
    encryptedGatewaySubscriptionId: null,
    encryptionKeyVersion: 1,
    gatewaySubscriptionLookupHash: null,
    status: SubscriptionStatus.ACTIVE,
    billingInterval: BillingInterval.MONTHLY,
    currency: 'USD',
    amountMinor: 500,
    currentPeriodStart: new Date('2026-08-06T18:45:54.539Z'),
    currentPeriodEnd: new Date('2026-09-06T18:45:54.539Z'),
    cancelAtPeriodEnd: false,
    cancelledAt: null,
    pastDueAt: null,
    gracePeriodEndsAt: null,
    entitlementValidUntil: new Date('2026-09-06T18:45:54.539Z'),
    scheduledPlanId: null,
    scheduledPlanSlug: null,
    scheduledPlanPriceVersionId: null,
    scheduledAmountMinor: null,
    scheduledBillingInterval: null,
    scheduledEffectiveAt: null,
    scheduledChangeReason: null,
    version: 0,
    uniqueActiveKey: 'user_1',
    createdAt: new Date('2026-08-06T18:45:54.556Z'),
    updatedAt: new Date('2026-08-06T18:45:54.556Z'),
    ...overrides,
  };
}

export function buildInvoice(overrides: Partial<Invoice> = {}): Invoice {
  return {
    id: 'inv_1',
    number: 'CLAW-00000001',
    userId: 'user_1',
    subscriptionId: 'sub_1',
    status: InvoiceStatus.PAID,
    currency: 'USD',
    subtotalMinor: 500,
    discountMinor: 0,
    taxMinor: 0,
    totalMinor: 500,
    amountPaidMinor: 500,
    amountRefundedMinor: 0,
    periodStart: new Date('2026-08-06T18:45:54.539Z'),
    periodEnd: new Date('2026-09-06T18:45:54.539Z'),
    issuedAt: new Date('2026-08-06T18:45:54.809Z'),
    paidAt: new Date('2026-08-06T18:45:54.620Z'),
    createdAt: new Date('2026-08-06T18:45:54.809Z'),
    updatedAt: new Date('2026-08-06T18:45:54.809Z'),
    ...overrides,
  };
}
