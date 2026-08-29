import {
  BillingErrorCode,
  EntitlementGrantType,
  EventPattern,
  PaymentTransactionType,
  SubscriptionStatus,
} from '@claw/shared-types';

import { RefundStatus } from '../../../../generated/prisma';
import { RefundCompletionService } from '../refund-completion.service';

describe('RefundCompletionService', () => {
  const now = new Date('2026-07-27T03:00:00.000Z');
  const refund = {
    id: 'refund-1',
    paymentTransactionId: 'charge-1',
    subscriptionId: 'subscription-1',
    invoiceId: 'invoice-1',
    userId: 'user-1',
    requestedByUserId: 'admin-1',
    gateway: 'PAYPAL',
    status: RefundStatus.PENDING,
    amountMinor: 4_000,
    currency: 'USD',
    idempotencyKey: 'request-key-1',
    providerIdempotencyKey: 'provider-key-1',
    providerRefundId: null,
    reason: 'Customer request',
    failureCode: null,
    completedAt: null,
    createdAt: now,
    updatedAt: now,
  };
  const charge = {
    id: 'charge-1',
    amountMinor: 10_000,
    providerAmountMinor: 10_000,
    providerCurrency: 'USD',
  };
  const subscription = {
    id: 'subscription-1',
    userId: 'user-1',
    planId: 'plan-pro',
    planSlug: 'pro',
    planPriceVersionId: 'price-v1',
    status: SubscriptionStatus.ACTIVE,
    entitlementValidUntil: new Date('2026-08-27T00:00:00.000Z'),
  };
  const tx = {
    subscription: { update: jest.fn() },
  };
  const prisma = {
    $transaction: jest.fn(async (callback: (client: typeof tx) => Promise<unknown>) =>
      callback(tx),
    ),
  };
  const repository = {
    findForCompletion: jest.fn(),
    markSucceeded: jest.fn(),
    sumSucceededAmount: jest.fn(),
  };
  const records = { recordReversal: jest.fn() };
  const outbox = { enqueue: jest.fn() };
  const creditTopups = { enqueueReversalInTransaction: jest.fn() };
  let service: RefundCompletionService;

  beforeEach(() => {
    jest.clearAllMocks();
    repository.findForCompletion.mockResolvedValue({ refund, charge, subscription });
    repository.markSucceeded.mockResolvedValue({
      ...refund,
      status: RefundStatus.SUCCEEDED,
      providerRefundId: 'provider-refund-1',
      completedAt: now,
    });
    repository.sumSucceededAmount.mockResolvedValue(4_000);
    records.recordReversal.mockResolvedValue('reversal-1');
    service = new RefundCompletionService(
      prisma as never,
      repository as never,
      records as never,
      outbox as never,
      creditTopups as never,
    );
    jest.useFakeTimers().setSystemTime(now);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('records a partial refund without revoking the subscription', async () => {
    await service.complete('refund-1', 'provider-refund-1', 'correlation-1');

    expect(records.recordReversal).toHaveBeenCalledWith(
      tx,
      expect.objectContaining({
        type: PaymentTransactionType.REFUND,
        amountMinor: 4_000,
        reversesTransactionId: 'charge-1',
      }),
    );
    expect(tx.subscription.update).not.toHaveBeenCalled();
    expect(outbox.enqueue).toHaveBeenCalledWith(
      tx,
      expect.objectContaining({
        pattern: EventPattern.BILLING_PAYMENT_REFUNDED,
        payloadJson: expect.objectContaining({
          isFullRefund: false,
          refundedAmountMinor: 4_000,
          grantType: EntitlementGrantType.PAID_SUBSCRIPTION,
          entitlementValidUntil: '2026-08-27T00:00:00.000Z',
        }),
      }),
    );
  });

  it('revokes entitlement exactly when cumulative succeeded refunds equal the capture', async () => {
    repository.sumSucceededAmount.mockResolvedValueOnce(10_000);

    await service.complete('refund-1', 'provider-refund-1', 'correlation-2');

    expect(tx.subscription.update).toHaveBeenCalledWith({
      where: { id: 'subscription-1' },
      data: {
        status: SubscriptionStatus.REFUNDED,
        uniqueActiveKey: null,
        version: { increment: 1 },
      },
    });
    expect(outbox.enqueue).toHaveBeenCalledWith(
      tx,
      expect.objectContaining({
        payloadJson: expect.objectContaining({
          isFullRefund: true,
          entitlementValidUntil: now.toISOString(),
        }),
      }),
    );
  });

  it('is idempotent after a refund has already succeeded', async () => {
    repository.findForCompletion.mockResolvedValueOnce({
      refund: { ...refund, status: RefundStatus.SUCCEEDED },
      charge,
      subscription,
    });

    await service.complete('refund-1', 'provider-refund-1', 'correlation-3');

    expect(records.recordReversal).not.toHaveBeenCalled();
    expect(repository.markSucceeded).not.toHaveBeenCalled();
    expect(outbox.enqueue).not.toHaveBeenCalled();
  });

  it('fails with a stable not-found code before recording a reversal', async () => {
    repository.findForCompletion.mockResolvedValueOnce(null);

    await expect(
      service.complete('missing-refund', 'provider-refund-1', 'correlation-4'),
    ).rejects.toMatchObject({ code: BillingErrorCode.REFUND_NOT_FOUND });
    expect(records.recordReversal).not.toHaveBeenCalled();
    expect(repository.markSucceeded).not.toHaveBeenCalled();
  });

  it('routes a refunded CREDIT_TOPUP to the credit reversal, not the entitlement event', async () => {
    repository.findForCompletion.mockResolvedValue({
      refund: { ...refund, subscriptionId: null, amountMinor: 2_500 },
      charge: {
        id: 'charge-1',
        type: PaymentTransactionType.CREDIT_TOPUP,
        amountMinor: 2_500,
        providerAmountMinor: 2_500,
        providerCurrency: 'USD',
        priceSnapshotJson: {
          packageId: 'pkg-25',
          packageVersionId: 'cpv-9',
          creditMicroUsd: '15000000',
          amountMinor: 2_500,
          currency: 'USD',
        },
      },
      subscription: null,
    });

    await service.complete('refund-1', 'provider-refund-1', 'correlation-topup');

    expect(creditTopups.enqueueReversalInTransaction).toHaveBeenCalledWith(
      tx,
      expect.objectContaining({
        userId: 'user-1',
        sourcePaymentTransactionId: 'charge-1',
        packageId: 'pkg-25',
        packageVersionId: 'cpv-9',
        creditMicroUsd: 15_000_000n,
      }),
      'reversal-1',
    );
    // ADR-064 is untouched: a credit reversal revokes nothing, because the
    // money it returns never bought access.
    expect(tx.subscription.update).not.toHaveBeenCalled();
    expect(outbox.enqueue).not.toHaveBeenCalled();
  });

  it('reverses only the proportional credit for a partial top-up refund', async () => {
    repository.findForCompletion.mockResolvedValue({
      refund: { ...refund, subscriptionId: null, amountMinor: 500 },
      charge: {
        id: 'charge-1',
        type: PaymentTransactionType.CREDIT_TOPUP,
        amountMinor: 2_500,
        providerAmountMinor: 2_500,
        providerCurrency: 'USD',
        priceSnapshotJson: {
          packageId: 'pkg-25',
          packageVersionId: 'cpv-9',
          creditMicroUsd: '15000000',
          amountMinor: 2_500,
          currency: 'USD',
        },
      },
      subscription: null,
    });

    await service.complete('refund-1', 'provider-refund-1', 'correlation-topup');

    expect(creditTopups.enqueueReversalInTransaction).toHaveBeenCalledWith(
      tx,
      expect.objectContaining({ creditMicroUsd: 3_000_000n }),
      'reversal-1',
    );
  });

  it('refuses a top-up reversal whose frozen snapshot cannot be read', async () => {
    repository.findForCompletion.mockResolvedValue({
      refund: { ...refund, subscriptionId: null },
      charge: {
        id: 'charge-1',
        type: PaymentTransactionType.CREDIT_TOPUP,
        amountMinor: 2_500,
        providerAmountMinor: 2_500,
        providerCurrency: 'USD',
        priceSnapshotJson: null,
      },
      subscription: null,
    });

    // The money has already gone back. An operator ticket is a far better
    // outcome than a wallet quietly wrong by a guessed amount.
    await expect(
      service.complete('refund-1', 'provider-refund-1', 'correlation-topup'),
    ).rejects.toMatchObject({ code: BillingErrorCode.PAYMENT_REFERENCE_MISMATCH });
    expect(creditTopups.enqueueReversalInTransaction).not.toHaveBeenCalled();
  });

  it('converges when the compensating transaction was already recorded', async () => {
    records.recordReversal.mockResolvedValueOnce(null);

    await expect(
      service.complete('refund-1', 'provider-refund-1', 'correlation-5'),
    ).resolves.toEqual(expect.objectContaining({ status: RefundStatus.SUCCEEDED }));
    expect(repository.markSucceeded).toHaveBeenCalled();
    expect(repository.sumSucceededAmount).not.toHaveBeenCalled();
    expect(tx.subscription.update).not.toHaveBeenCalled();
    expect(outbox.enqueue).not.toHaveBeenCalled();
  });
});
