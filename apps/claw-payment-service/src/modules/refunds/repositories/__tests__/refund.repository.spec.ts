import {
  BillingGateway,
  PaymentTransactionStatus,
  PaymentTransactionType,
} from '@claw/shared-types';

import { RefundStatus } from '../../../../generated/prisma';
import { REFUNDABLE_CHARGE_TYPES } from '../../constants/refundable-charge.constants';
import { RefundRepository } from '../refund.repository';

describe('RefundRepository', () => {
  const prisma = {
    paymentTransaction: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
    },
    refund: {
      aggregate: jest.fn(),
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  };
  const repository = new RefundRepository(prisma as never);
  const capturedCharge = {
    id: 'charge-1',
    userId: 'user-1',
    subscriptionId: 'subscription-1',
    type: PaymentTransactionType.CHARGE,
    gateway: BillingGateway.PAYPAL,
    amountMinor: 10_000,
    currency: 'USD',
    providerAmountMinor: 10_000,
    providerCurrency: 'USD',
    providerTransactionId: 'capture-1',
  };
  const refund = {
    id: 'refund-1',
    paymentTransactionId: 'charge-1',
    subscriptionId: 'subscription-1',
    invoiceId: null,
    userId: 'user-1',
    requestedByUserId: 'admin-1',
    gateway: BillingGateway.PAYPAL,
    status: RefundStatus.PENDING,
    amountMinor: 2_500,
    currency: 'USD',
    providerAmountMinor: 2_500,
    providerCurrency: 'USD',
    idempotencyKey: 'request-1',
    providerIdempotencyKey: 'provider-request-1',
    providerRefundId: null,
    reason: 'Customer request',
    failureCode: null,
    automatic: false,
    attempts: 0,
    nextAttemptAt: null,
    completedAt: null,
    createdAt: new Date('2026-07-27T10:00:00.000Z'),
    updatedAt: new Date('2026-07-27T10:00:00.000Z'),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('finds an operator refund by its scoped idempotency key', async () => {
    prisma.refund.findUnique.mockResolvedValueOnce(refund);

    await expect(repository.findByIdempotencyKey('admin-1', 'request-1')).resolves.toBe(refund);
    expect(prisma.refund.findUnique).toHaveBeenCalledWith({
      where: {
        requestedByUserId_idempotencyKey: {
          requestedByUserId: 'admin-1',
          idempotencyKey: 'request-1',
        },
      },
    });
  });

  it('finds a provider refund by gateway and provider identifier', async () => {
    prisma.refund.findUnique.mockResolvedValueOnce(refund);

    await expect(
      repository.findByProviderRefundId(BillingGateway.PAYPAL, 'provider-refund-1'),
    ).resolves.toBe(refund);
    expect(prisma.refund.findUnique).toHaveBeenCalledWith({
      where: {
        gateway_providerRefundId: {
          gateway: BillingGateway.PAYPAL,
          providerRefundId: 'provider-refund-1',
        },
      },
    });
  });

  it('returns an eligible captured charge with its provider reference', async () => {
    prisma.paymentTransaction.findFirst.mockResolvedValueOnce(capturedCharge);

    await expect(repository.findCapturedCharge('charge-1')).resolves.toEqual(capturedCharge);
    expect(prisma.paymentTransaction.findFirst).toHaveBeenCalledWith({
      where: {
        id: 'charge-1',
        type: { in: REFUNDABLE_CHARGE_TYPES },
        status: PaymentTransactionStatus.CAPTURED,
        // Deliberately NOT `subscriptionId: { not: null }`: a PAYG credit
        // top-up is a real captured charge that buys a balance, not a plan.
        providerTransactionId: { not: null },
      },
    });
  });

  it('finds a captured CREDIT_TOPUP even though it has no subscription', async () => {
    prisma.paymentTransaction.findFirst.mockResolvedValueOnce({
      ...capturedCharge,
      subscriptionId: null,
      type: PaymentTransactionType.CREDIT_TOPUP,
    });

    // Refusing to find it here would leave a refunded top-up with the money
    // returned and the credit still spendable.
    await expect(repository.findCapturedCharge('charge-1')).resolves.toEqual(
      expect.objectContaining({
        subscriptionId: null,
        type: PaymentTransactionType.CREDIT_TOPUP,
      }),
    );
  });

  it('does not expose a charge that is absent or lacks a required relation', async () => {
    prisma.paymentTransaction.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ ...capturedCharge, providerTransactionId: null })
      .mockResolvedValueOnce({ ...capturedCharge, type: 'SOMETHING_NEWER' });

    await expect(repository.findCapturedCharge('missing')).resolves.toBeNull();
    await expect(repository.findCapturedCharge('unsettled')).resolves.toBeNull();
    // A type this build cannot classify is refused rather than guessed at: the
    // column is TEXT, and guessing decides whether a plan or a wallet is hit.
    await expect(repository.findCapturedCharge('unknown-type')).resolves.toBeNull();
  });

  it('lists recent captured charges with only reserved refund amounts', async () => {
    const capturedAt = new Date('2026-07-27T10:00:00.000Z');
    prisma.paymentTransaction.findMany.mockResolvedValueOnce([
      {
        id: 'charge-1',
        userId: 'user-1',
        subscriptionId: 'subscription-1',
        gateway: BillingGateway.PAYPAL,
        amountMinor: 10_000,
        currency: 'USD',
        providerAmountMinor: 10_000,
        providerCurrency: 'USD',
        capturedAt,
        refunds: [{ amountMinor: 2_500 }],
      },
    ]);

    await expect(repository.listRefundableCharges()).resolves.toEqual([
      {
        id: 'charge-1',
        userId: 'user-1',
        subscriptionId: 'subscription-1',
        gateway: BillingGateway.PAYPAL,
        amountMinor: 10_000,
        currency: 'USD',
        providerAmountMinor: 10_000,
        providerCurrency: 'USD',
        capturedAt,
        reservedAmounts: [2_500],
      },
    ]);
    expect(prisma.paymentTransaction.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        take: 50,
        orderBy: { capturedAt: 'desc' },
        where: expect.objectContaining({ capturedAt: { not: null } }),
      }),
    );
  });

  it('drops defensive rows that lack a subscription or capture timestamp', async () => {
    prisma.paymentTransaction.findMany.mockResolvedValueOnce([
      {
        ...capturedCharge,
        subscriptionId: null,
        capturedAt: new Date('2026-07-27T10:00:00.000Z'),
        refunds: [],
      },
      {
        ...capturedCharge,
        capturedAt: null,
        refunds: [],
      },
    ]);

    await expect(repository.listRefundableCharges()).resolves.toEqual([]);
  });

  it('lists only amounts that reserve captured balance', async () => {
    prisma.refund.findMany.mockResolvedValueOnce([{ amountMinor: 2_500 }, { amountMinor: 1_000 }]);

    await expect(repository.listReservedAmounts('charge-1')).resolves.toEqual([2_500, 1_000]);
    expect(prisma.refund.findMany).toHaveBeenCalledWith({
      where: {
        paymentTransactionId: 'charge-1',
        status: { in: [RefundStatus.PENDING, RefundStatus.SUCCEEDED] },
      },
      select: { amountMinor: true },
    });
  });

  it('persists an immutable refund reservation from the captured charge', async () => {
    prisma.refund.create.mockResolvedValueOnce(refund);

    await expect(
      repository.reserve({
        requestedByUserId: 'admin-1',
        paymentTransactionId: 'charge-1',
        amountMinor: 2_500,
        idempotencyKey: 'request-1',
        providerIdempotencyKey: 'provider-request-1',
        reason: 'Customer request',
        charge: capturedCharge,
        providerAmountMinor: 2_500,
        providerCurrency: 'USD',
      }),
    ).resolves.toBe(refund);
    expect(prisma.refund.create).toHaveBeenCalledWith({
      data: {
        paymentTransactionId: 'charge-1',
        subscriptionId: 'subscription-1',
        invoiceId: null,
        userId: 'user-1',
        requestedByUserId: 'admin-1',
        gateway: BillingGateway.PAYPAL,
        status: RefundStatus.PENDING,
        amountMinor: 2_500,
        currency: 'USD',
        providerAmountMinor: 2_500,
        providerCurrency: 'USD',
        idempotencyKey: 'request-1',
        providerIdempotencyKey: 'provider-request-1',
        reason: 'Customer request',
      },
    });
  });

  it('records provider acceptance and stable provider failure state', async () => {
    prisma.refund.update.mockResolvedValueOnce({
      ...refund,
      providerRefundId: 'provider-refund-1',
    });
    await expect(repository.markProviderAccepted('refund-1', 'provider-refund-1')).resolves.toEqual(
      expect.objectContaining({ providerRefundId: 'provider-refund-1' }),
    );
    expect(prisma.refund.update).toHaveBeenNthCalledWith(1, {
      where: { id: 'refund-1' },
      data: {
        providerRefundId: 'provider-refund-1',
        failureCode: null,
        nextAttemptAt: null,
        attempts: { increment: 1 },
      },
    });

    prisma.refund.update.mockResolvedValueOnce({
      ...refund,
      status: RefundStatus.FAILED,
      failureCode: 'PROVIDER_REJECTED',
    });
    await expect(repository.markFailed('refund-1', 'PROVIDER_REJECTED')).resolves.toBeUndefined();
    expect(prisma.refund.update).toHaveBeenNthCalledWith(2, {
      where: { id: 'refund-1' },
      data: { status: RefundStatus.FAILED, failureCode: 'PROVIDER_REJECTED' },
    });
  });

  it('hydrates the locked completion context and preserves a missing result', async () => {
    const transaction = {
      refund: {
        findUnique: jest
          .fn()
          .mockResolvedValueOnce(null)
          .mockResolvedValueOnce({
            ...refund,
            paymentTransaction: capturedCharge,
            subscription: { id: 'subscription-1', planId: 'plan-pro' },
          }),
      },
    };

    await expect(repository.findForCompletion(transaction as never, 'missing')).resolves.toBeNull();
    await expect(repository.findForCompletion(transaction as never, 'refund-1')).resolves.toEqual({
      refund,
      charge: capturedCharge,
      subscription: { id: 'subscription-1', planId: 'plan-pro' },
    });
    expect(transaction.refund.findUnique).toHaveBeenLastCalledWith({
      where: { id: 'refund-1' },
      include: { paymentTransaction: true, subscription: true },
    });
  });

  it('marks completion and sums only succeeded refund amounts', async () => {
    const completedAt = new Date('2026-07-27T11:00:00.000Z');
    const transaction = {
      refund: {
        aggregate: jest
          .fn()
          .mockResolvedValueOnce({ _sum: { amountMinor: 4_000 } })
          .mockResolvedValueOnce({ _sum: { amountMinor: null } }),
        update: jest.fn().mockResolvedValueOnce({
          ...refund,
          status: RefundStatus.SUCCEEDED,
          providerRefundId: 'provider-refund-1',
          completedAt,
        }),
      },
    };

    await expect(
      repository.markSucceeded(transaction as never, 'refund-1', 'provider-refund-1', completedAt),
    ).resolves.toEqual(expect.objectContaining({ status: RefundStatus.SUCCEEDED }));
    expect(transaction.refund.update).toHaveBeenCalledWith({
      where: { id: 'refund-1' },
      data: {
        status: RefundStatus.SUCCEEDED,
        providerRefundId: 'provider-refund-1',
        failureCode: null,
        completedAt,
      },
    });

    await expect(repository.sumSucceededAmount(transaction as never, 'charge-1')).resolves.toBe(
      4_000,
    );
    await expect(repository.sumSucceededAmount(transaction as never, 'charge-2')).resolves.toBe(0);
    expect(transaction.refund.aggregate).toHaveBeenCalledWith({
      where: {
        paymentTransactionId: 'charge-1',
        status: RefundStatus.SUCCEEDED,
      },
      _sum: { amountMinor: true },
    });
  });
});
