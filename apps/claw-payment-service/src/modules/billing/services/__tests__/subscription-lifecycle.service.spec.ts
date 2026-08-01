import { EventPattern, PaymentTransactionType, SubscriptionStatus } from '@claw/shared-types';

import type { PrismaService } from '../../../../infrastructure/database/prisma/prisma.service';
import type { OutboxRepository } from '../../../outbox/repositories/outbox.repository';
import type { BillingRecordService } from '../billing-record.service';
import { SubscriptionLifecycleService } from '../subscription-lifecycle.service';

describe('SubscriptionLifecycleService grace expiry', () => {
  let updateMany: jest.Mock;
  let outbox: { enqueue: jest.Mock };
  let service: SubscriptionLifecycleService;

  beforeEach(() => {
    updateMany = jest.fn().mockResolvedValue({ count: 1 });
    const prisma = {
      $transaction: jest.fn(
        async (callback: (tx: { subscription: { updateMany: jest.Mock } }) => Promise<unknown>) =>
          callback({ subscription: { updateMany } }),
      ),
    };
    outbox = { enqueue: jest.fn() };
    service = new SubscriptionLifecycleService(
      prisma as unknown as PrismaService,
      outbox as unknown as OutboxRepository,
      {} as BillingRecordService,
    );
  });

  it('expires only the exact past-due version at the inclusive deadline', async () => {
    const deadline = new Date('2026-07-26T12:00:00.000Z');

    await expect(
      service.expirePastDueIfVersionMatches(
        'subscription-1',
        'user-1',
        3,
        deadline,
        deadline,
        'run-1',
      ),
    ).resolves.toBe(true);

    expect(updateMany).toHaveBeenCalledWith({
      where: {
        id: 'subscription-1',
        status: SubscriptionStatus.PAST_DUE,
        version: 3,
        gracePeriodEndsAt: { equals: deadline, lte: deadline },
      },
      data: {
        status: SubscriptionStatus.EXPIRED,
        uniqueActiveKey: null,
        version: { increment: 1 },
      },
    });
    expect(outbox.enqueue).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ pattern: EventPattern.BILLING_SUBSCRIPTION_EXPIRED }),
    );
  });

  it('is a no-op when another lock owner already moved the version', async () => {
    updateMany.mockResolvedValueOnce({ count: 0 });

    await expect(
      service.expirePastDueIfVersionMatches(
        'subscription-1',
        'user-1',
        3,
        new Date('2026-07-26T12:00:00.000Z'),
        new Date('2026-07-26T12:00:01.000Z'),
        'run-1',
      ),
    ).resolves.toBe(false);
    expect(outbox.enqueue).not.toHaveBeenCalled();
  });

  it('expires only the exact active entitlement window and releases the active key', async () => {
    const deadline = new Date('2026-07-26T12:00:00.000Z');

    await expect(
      service.expireLapsedIfVersionMatches(
        'subscription-1',
        'user-1',
        4,
        deadline,
        deadline,
        'run-lapsed',
      ),
    ).resolves.toBe(true);

    expect(updateMany).toHaveBeenCalledWith({
      where: {
        id: 'subscription-1',
        version: 4,
        uniqueActiveKey: 'user-1',
        entitlementValidUntil: { equals: deadline, lte: deadline },
      },
      data: {
        status: SubscriptionStatus.EXPIRED,
        uniqueActiveKey: null,
        version: { increment: 1 },
      },
    });
  });
});

describe('SubscriptionLifecycleService paid plan change activation', () => {
  it('updates the active subscription and clears its retirement schedule atomically', async () => {
    const source = {
      id: 'subscription-1',
      userId: 'user-1',
      planId: 'plan-old',
      planSlug: 'old',
      planPriceVersionId: 'price-old',
      status: SubscriptionStatus.ACTIVE,
      version: 7,
      uniqueActiveKey: 'user-1',
      currentPeriodStart: new Date('2026-08-01T00:00:00.000Z'),
      currentPeriodEnd: new Date('2026-09-01T00:00:00.000Z'),
      entitlementValidUntil: new Date('2026-09-04T00:00:00.000Z'),
    };
    const subscription = {
      create: jest.fn(),
      findUnique: jest.fn().mockResolvedValue(source),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
    };
    const checkoutSession = { update: jest.fn() };
    const prorationQuote = {
      findUnique: jest.fn().mockResolvedValue({
        id: 'quote-1',
        userId: 'user-1',
        subscriptionId: 'subscription-1',
        currentPlanId: 'plan-old',
        currentPlanPriceVersionId: 'price-old',
        targetPlanId: 'plan-new',
        targetPlanSlug: 'new',
        targetPlanPriceVersionId: 'price-new',
        targetAmountMinor: 3000,
        targetBillingInterval: 'MONTHLY',
        currency: 'USD',
        amountDueMinor: 500,
        status: 'CONSUMED',
        isScheduledForPeriodEnd: false,
      }),
    };
    const tx = { subscription, checkoutSession, prorationQuote };
    const prisma = {
      $transaction: jest.fn(async (callback: (client: typeof tx) => Promise<unknown>) =>
        callback(tx),
      ),
    };
    const outbox = { enqueue: jest.fn() };
    const records = {
      recordCharge: jest.fn().mockResolvedValue({
        transactionId: 'transaction-1',
        invoiceNumber: 'CLAW-00000001',
      }),
    };
    const service = new SubscriptionLifecycleService(
      prisma as unknown as PrismaService,
      outbox as unknown as OutboxRepository,
      records as unknown as BillingRecordService,
    );
    const input = {
      paymentVerified: true,
      userId: 'user-1',
      invoiceRecipientEmail: 'buyer@example.com',
      billingCustomerId: 'customer-1',
      checkoutSessionId: 'session-1',
      planId: 'plan-new',
      planSlug: 'new',
      planPriceVersionId: 'price-new',
      gateway: 'PAYPAL',
      billingInterval: 'MONTHLY',
      baseCurrency: 'USD',
      baseAmountMinor: 500,
      periodStartMs: Date.parse('2026-08-15T00:00:00.000Z'),
      periodEndMs: Date.parse('2026-09-15T00:00:00.000Z'),
      entitlementValidUntilMs: Date.parse('2026-09-18T00:00:00.000Z'),
      encryptedGatewaySubscriptionId: null,
      gatewaySubscriptionLookupHash: null,
      correlationId: 'webhook-1',
      providerTransactionId: 'capture-1',
      providerOrderId: 'order-1',
      providerAmountMinor: 500,
      providerCurrency: 'USD',
      existingSubscriptionId: 'subscription-1',
      prorationQuoteId: 'quote-1',
    };

    await service.activatePlanChangeFromVerifiedPayment(input);

    expect(subscription.create).not.toHaveBeenCalled();
    expect(subscription.updateMany).toHaveBeenCalledWith({
      where: {
        id: 'subscription-1',
        userId: 'user-1',
        planId: 'plan-old',
        planPriceVersionId: 'price-old',
        uniqueActiveKey: 'user-1',
        version: 7,
      },
      data: expect.objectContaining({
        planId: 'plan-new',
        planSlug: 'new',
        planPriceVersionId: 'price-new',
        amountMinor: 3000,
        scheduledPlanId: null,
        scheduledPlanSlug: null,
        scheduledPlanPriceVersionId: null,
        scheduledAmountMinor: null,
        scheduledBillingInterval: null,
        scheduledEffectiveAt: null,
        scheduledChangeReason: null,
        version: { increment: 1 },
      }),
    });
    expect(records.recordCharge).toHaveBeenCalledWith(
      tx,
      expect.objectContaining({
        subscriptionId: 'subscription-1',
        type: PaymentTransactionType.PRORATION_CHARGE,
        amountMinor: 500,
        periodStart: source.currentPeriodStart,
        periodEnd: source.currentPeriodEnd,
      }),
    );
    expect(outbox.enqueue).toHaveBeenCalledWith(
      tx,
      expect.objectContaining({ pattern: EventPattern.BILLING_SUBSCRIPTION_UPGRADED }),
    );
  });
});
