import {
  BillingErrorCode,
  BillingGateway,
  EventPattern,
  PaymentTransactionType,
  SubscriptionStatus,
} from '@claw/shared-types';

import { PaymentReversalService } from '../payment-reversal.service';

const TOPUP_SNAPSHOT = {
  packageId: 'pkg-25',
  packageVersionId: 'cpv-9',
  creditMicroUsd: '15000000',
  amountMinor: 2_500,
  currency: 'USD',
};

describe('PaymentReversalService', () => {
  const lifecycle = { reverseAndRevoke: jest.fn() };
  const refundWebhooks = { apply: jest.fn() };
  const creditTopups = { reverseCreditTopup: jest.fn() };
  const transactions = { findById: jest.fn() };
  const service = new PaymentReversalService(
    lifecycle as never,
    refundWebhooks as never,
    creditTopups as never,
    transactions as never,
  );
  const request = {
    subscriptionId: 'subscription-1',
    userId: 'user-1',
    gateway: BillingGateway.PAYPAL,
    amountMinor: 10_000,
    currency: 'USD',
    providerAmountMinor: 10_000,
    providerCurrency: 'USD',
    providerTransactionId: 'reversal-1',
    originalTransactionId: 'charge-1',
    invoiceId: null,
    correlationId: 'event-1',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('delegates refunds to the first-class refund workflow', async () => {
    refundWebhooks.apply.mockResolvedValueOnce(true);

    await expect(service.refund(request)).resolves.toBe(true);
    expect(refundWebhooks.apply).toHaveBeenCalledWith(request);
    expect(lifecycle.reverseAndRevoke).not.toHaveBeenCalled();
  });

  it('makes a chargeback terminal and revokes entitlement immediately', async () => {
    lifecycle.reverseAndRevoke.mockResolvedValueOnce(true);

    await service.chargeback(request);

    expect(lifecycle.reverseAndRevoke).toHaveBeenCalledWith(
      expect.objectContaining({
        type: PaymentTransactionType.CHARGEBACK,
        status: SubscriptionStatus.CHARGEBACK,
        pattern: EventPattern.BILLING_PAYMENT_CHARGEBACK,
        reversesTransactionId: 'charge-1',
      }),
    );
  });

  it('uses the subscription as the chargeback idempotency fallback', async () => {
    lifecycle.reverseAndRevoke.mockResolvedValueOnce(true);

    await service.chargeback({ ...request, providerTransactionId: null });

    expect(lifecycle.reverseAndRevoke).toHaveBeenCalledWith(
      expect.objectContaining({
        idempotencyKey: 'chargeback:subscription-1',
        providerTransactionId: null,
      }),
    );
  });

  describe('a disputed credit top-up', () => {
    const topupRequest = {
      ...request,
      subscriptionId: null,
      amountMinor: 2_500,
      providerAmountMinor: 2_500,
    };

    it('debits the wallet and leaves every plan entitlement alone', async () => {
      transactions.findById.mockResolvedValueOnce({
        id: 'charge-1',
        type: PaymentTransactionType.CREDIT_TOPUP,
        amountMinor: 2_500,
        priceSnapshotJson: TOPUP_SNAPSHOT,
      });
      creditTopups.reverseCreditTopup.mockResolvedValueOnce(true);

      await expect(service.chargeback(topupRequest)).resolves.toBe(true);

      // The money in dispute never bought access, so there is no access to take
      // away — and revoking a plan the customer pays for separately would be
      // theft in the other direction.
      expect(lifecycle.reverseAndRevoke).not.toHaveBeenCalled();
      expect(creditTopups.reverseCreditTopup).toHaveBeenCalledWith(
        expect.objectContaining({
          type: PaymentTransactionType.CHARGEBACK,
          sourcePaymentTransactionId: 'charge-1',
          packageId: 'pkg-25',
          packageVersionId: 'cpv-9',
          creditMicroUsd: 15_000_000n,
        }),
      );
    });

    it('reverses the proportional credit for a partial dispute', async () => {
      transactions.findById.mockResolvedValueOnce({
        id: 'charge-1',
        type: PaymentTransactionType.CREDIT_TOPUP,
        amountMinor: 2_500,
        priceSnapshotJson: TOPUP_SNAPSHOT,
      });
      creditTopups.reverseCreditTopup.mockResolvedValueOnce(true);

      await service.chargeback({ ...topupRequest, amountMinor: 500 });

      expect(creditTopups.reverseCreditTopup).toHaveBeenCalledWith(
        expect.objectContaining({ creditMicroUsd: 3_000_000n }),
      );
    });

    it('refuses when the reversed charge is not a readable top-up', async () => {
      transactions.findById.mockResolvedValueOnce({
        id: 'charge-1',
        type: PaymentTransactionType.CREDIT_TOPUP,
        amountMinor: 2_500,
        priceSnapshotJson: null,
      });

      await expect(service.chargeback(topupRequest)).rejects.toMatchObject({
        code: BillingErrorCode.PAYMENT_REFERENCE_MISMATCH,
      });
      expect(creditTopups.reverseCreditTopup).not.toHaveBeenCalled();
    });

    it('refuses a plan-less reversal against a charge that is not a top-up', async () => {
      transactions.findById.mockResolvedValueOnce({
        id: 'charge-1',
        type: PaymentTransactionType.CHARGE,
        amountMinor: 2_500,
        priceSnapshotJson: TOPUP_SNAPSHOT,
      });

      await expect(service.chargeback(topupRequest)).rejects.toMatchObject({
        code: BillingErrorCode.PAYMENT_REFERENCE_MISMATCH,
      });
    });

    it('still routes a top-up REFUND through the shared refund workflow', async () => {
      refundWebhooks.apply.mockResolvedValueOnce(true);

      await expect(service.refund(topupRequest)).resolves.toBe(true);

      // One reversal ledger, two meanings: the completion service decides which
      // event to enqueue from the charge it is reversing.
      expect(refundWebhooks.apply).toHaveBeenCalledWith(topupRequest);
      expect(creditTopups.reverseCreditTopup).not.toHaveBeenCalled();
    });
  });
});
