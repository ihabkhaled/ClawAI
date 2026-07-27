import { Test } from '@nestjs/testing';
import {
  BillingGateway,
  BillingInterval,
  PaymentTransactionStatus,
  PaymentTransactionType,
  SubscriptionStatus,
} from '@claw/shared-types';

import { InternalPaymentsRepository } from '../../repositories/internal-payments.repository';
import { InternalPaymentsService } from '../internal-payments.service';

describe('InternalPaymentsService', () => {
  const now = new Date('2026-07-26T12:00:00.000Z');
  const repository = {
    findPaymentById: jest.fn(),
    findSubscriptionById: jest.fn(),
    findAuthoritativeSubscriptionForUser: jest.fn(),
  };
  let service: InternalPaymentsService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module = await Test.createTestingModule({
      providers: [
        InternalPaymentsService,
        { provide: InternalPaymentsRepository, useValue: repository },
      ],
    }).compile();
    service = module.get(InternalPaymentsService);
  });

  it('returns a bounded payment status contract', async () => {
    repository.findPaymentById.mockResolvedValue(paymentFixture());

    await expect(service.getPaymentStatus('payment-1')).resolves.toEqual({
      paymentTransactionId: 'payment-1',
      subscriptionId: 'subscription-1',
      userId: 'user-1',
      gateway: BillingGateway.PAYPAL,
      type: PaymentTransactionType.CHARGE,
      status: PaymentTransactionStatus.CAPTURED,
      amountMinor: 2500,
      currency: 'USD',
      capturedAt: '2026-07-26T10:00:00.000Z',
      createdAt: '2026-07-26T09:00:00.000Z',
      updatedAt: '2026-07-26T10:00:00.000Z',
    });
  });

  it('returns the subscription status contract', async () => {
    repository.findSubscriptionById.mockResolvedValue(subscriptionFixture());

    await expect(service.getSubscriptionStatus('subscription-1')).resolves.toMatchObject({
      subscriptionId: 'subscription-1',
      userId: 'user-1',
      status: SubscriptionStatus.ACTIVE,
      entitlementValidUntil: '2026-08-26T12:00:00.000Z',
    });
  });

  it.each([
    ['payment', () => service.getPaymentStatus('secret-id')],
    ['subscription', () => service.getSubscriptionStatus('secret-id')],
  ])('returns a generic 404 for an unknown %s id', async (_label, action) => {
    repository.findPaymentById.mockResolvedValue(null);
    repository.findSubscriptionById.mockResolvedValue(null);

    await expect(action()).rejects.toMatchObject({
      status: 404,
      response: {
        messageKey: 'errors.billingRecord.notFound',
        code: 'ENTITY_NOT_FOUND',
      },
    });
    await expect(action()).rejects.not.toThrow('secret-id');
  });

  it('returns the paid plan only while the local entitlement is active', async () => {
    repository.findAuthoritativeSubscriptionForUser.mockResolvedValue(subscriptionFixture());

    await expect(service.getAuthoritativeEntitlement('user-1', now)).resolves.toEqual({
      userId: 'user-1',
      subscriptionId: 'subscription-1',
      hasPaidEntitlement: true,
      planId: 'plan-1',
      planSlug: 'pro',
      planPriceVersionId: 'price-1',
      subscriptionStatus: SubscriptionStatus.ACTIVE,
      effectiveAt: now.toISOString(),
      entitlementValidUntil: '2026-08-26T12:00:00.000Z',
    });
  });

  it('fails closed at the exact entitlement expiry boundary', async () => {
    repository.findAuthoritativeSubscriptionForUser.mockResolvedValue(
      subscriptionFixture({ entitlementValidUntil: now }),
    );

    await expect(service.getAuthoritativeEntitlement('user-1', now)).resolves.toMatchObject({
      hasPaidEntitlement: false,
      planId: null,
      planSlug: 'free',
      entitlementValidUntil: now.toISOString(),
    });
  });

  it('returns free when a user has no subscription history', async () => {
    repository.findAuthoritativeSubscriptionForUser.mockResolvedValue(null);

    await expect(service.getAuthoritativeEntitlement('user-1', now)).resolves.toEqual({
      userId: 'user-1',
      subscriptionId: null,
      hasPaidEntitlement: false,
      planId: null,
      planSlug: 'free',
      planPriceVersionId: null,
      subscriptionStatus: null,
      effectiveAt: now.toISOString(),
      entitlementValidUntil: now.toISOString(),
    });
  });
});

function paymentFixture() {
  return {
    id: 'payment-1',
    subscriptionId: 'subscription-1',
    userId: 'user-1',
    gateway: BillingGateway.PAYPAL,
    type: PaymentTransactionType.CHARGE,
    status: PaymentTransactionStatus.CAPTURED,
    amountMinor: 2500,
    currency: 'USD',
    capturedAt: new Date('2026-07-26T10:00:00.000Z'),
    createdAt: new Date('2026-07-26T09:00:00.000Z'),
    updatedAt: new Date('2026-07-26T10:00:00.000Z'),
  };
}

function subscriptionFixture(overrides: Record<string, unknown> = {}) {
  return {
    id: 'subscription-1',
    userId: 'user-1',
    planId: 'plan-1',
    planSlug: 'pro',
    planPriceVersionId: 'price-1',
    gateway: BillingGateway.PAYPAL,
    status: SubscriptionStatus.ACTIVE,
    billingInterval: BillingInterval.MONTHLY,
    entitlementValidUntil: new Date('2026-08-26T12:00:00.000Z'),
    gracePeriodEndsAt: null,
    updatedAt: new Date('2026-07-26T10:00:00.000Z'),
    ...overrides,
  };
}
