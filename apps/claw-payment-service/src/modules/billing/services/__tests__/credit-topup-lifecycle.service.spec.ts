import { BillingErrorCode, EventPattern, PaymentTransactionType } from '@claw/shared-types';

import { CreditTopupLifecycleService } from '../credit-topup-lifecycle.service';
import type { BillingRecordService } from '../billing-record.service';
import type { PrismaService } from '../../../../infrastructure/database/prisma/prisma.service';
import type { OutboxRepository } from '../../../outbox/repositories/outbox.repository';

const ACTIVATION = {
  paymentVerified: true,
  userId: 'user-1',
  invoiceRecipientEmail: 'buyer@example.com',
  checkoutSessionId: 'sess-1',
  gateway: 'PAYPAL',
  packageId: 'pkg-25',
  packageVersionId: 'cpv-9',
  creditMicroUsd: 15_000_000n,
  baseAmountMinor: 2500,
  baseCurrency: 'USD',
  providerAmountMinor: 2500,
  providerCurrency: 'USD',
  providerTransactionId: 'capture-1',
  providerOrderId: 'order-1',
  correlationId: 'corr-1',
};

const REVERSAL = {
  userId: 'user-1',
  gateway: 'PAYPAL',
  type: PaymentTransactionType.CHARGEBACK,
  amountMinor: 2500,
  currency: 'USD',
  providerAmountMinor: 2500,
  providerCurrency: 'USD',
  providerTransactionId: 'reversal-1',
  idempotencyKey: 'chargeback:reversal-1',
  sourcePaymentTransactionId: 'txn-1',
  packageId: 'pkg-25',
  packageVersionId: 'cpv-9',
  creditMicroUsd: 15_000_000n,
  invoiceId: null,
  correlationId: 'corr-1',
};

describe('CreditTopupLifecycleService', () => {
  let tx: { checkoutSession: { update: jest.Mock }; subscription: { update: jest.Mock } };
  let prisma: { $transaction: jest.Mock };
  let outbox: { enqueue: jest.Mock };
  let records: { recordCharge: jest.Mock; recordReversal: jest.Mock };
  let service: CreditTopupLifecycleService;

  beforeEach(() => {
    tx = {
      checkoutSession: { update: jest.fn().mockResolvedValue({}) },
      subscription: { update: jest.fn().mockResolvedValue({}) },
    };
    prisma = {
      $transaction: jest.fn(async (callback: (client: typeof tx) => Promise<unknown>) =>
        callback(tx),
      ),
    };
    outbox = { enqueue: jest.fn().mockResolvedValue({}) };
    records = {
      recordCharge: jest
        .fn()
        .mockResolvedValue({ transactionId: 'txn-1', invoiceId: 'inv-1', invoiceNumber: 'CLAW-1' }),
      recordReversal: jest.fn().mockResolvedValue('rev-1'),
    };
    service = new CreditTopupLifecycleService(
      prisma as unknown as PrismaService,
      outbox as unknown as OutboxRepository,
      records as unknown as BillingRecordService,
    );
  });

  it('refuses to mint credit for a payment nobody verified', async () => {
    await expect(
      service.activateFromVerifiedPayment({ ...ACTIVATION, paymentVerified: false }),
    ).rejects.toMatchObject({ code: BillingErrorCode.PAYMENT_NOT_VERIFIED });
    expect(records.recordCharge).not.toHaveBeenCalled();
    expect(outbox.enqueue).not.toHaveBeenCalled();
  });

  it('writes the charge, the invoice and the grant event in ONE transaction', async () => {
    await service.activateFromVerifiedPayment(ACTIVATION);

    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    // Every write received the SAME transaction client. A grant published
    // outside the transaction is a customer who paid and got nothing.
    expect(records.recordCharge).toHaveBeenCalledWith(tx, expect.anything());
    expect(outbox.enqueue).toHaveBeenCalledWith(tx, expect.anything());
  });

  it('records the money as CREDIT_TOPUP with no subscription', async () => {
    await service.activateFromVerifiedPayment(ACTIVATION);

    expect(records.recordCharge).toHaveBeenCalledWith(
      tx,
      expect.objectContaining({
        type: PaymentTransactionType.CREDIT_TOPUP,
        subscriptionId: null,
        amountMinor: 2500,
        currency: 'USD',
        periodStart: null,
        periodEnd: null,
      }),
    );
  });

  it('scopes the charge idempotency key to the checkout session', async () => {
    await service.activateFromVerifiedPayment(ACTIVATION);

    // The (userId, idempotencyKey) unique index is what makes a replayed
    // activation collide instead of double-billing and double-crediting.
    expect(records.recordCharge).toHaveBeenCalledWith(
      tx,
      expect.objectContaining({ idempotencyKey: 'credit-topup:sess-1' }),
    );
  });

  it('freezes the package binding and credit onto the charge snapshot', async () => {
    await service.activateFromVerifiedPayment(ACTIVATION);

    expect(records.recordCharge).toHaveBeenCalledWith(
      tx,
      expect.objectContaining({
        priceSnapshot: {
          packageId: 'pkg-25',
          packageVersionId: 'cpv-9',
          // A STRING: JSON has no BigInt and stringify throws on one.
          creditMicroUsd: '15000000',
          amountMinor: 2500,
          currency: 'USD',
        },
      }),
    );
  });

  it('enqueues the grant with the standard envelope and a string credit figure', async () => {
    await service.activateFromVerifiedPayment(ACTIVATION);

    expect(outbox.enqueue).toHaveBeenCalledWith(
      tx,
      expect.objectContaining({
        pattern: EventPattern.BILLING_CREDIT_TOPUP_SUCCEEDED,
        aggregateType: 'CreditTopup',
        aggregateId: 'txn-1',
        payloadJson: expect.objectContaining({
          schemaVersion: 1,
          producer: 'claw-payment-service',
          userId: 'user-1',
          creditMicroUsd: '15000000',
          packageId: 'pkg-25',
          packageVersionId: 'cpv-9',
          paymentTransactionId: 'txn-1',
          amountMinor: 2500,
          currency: 'USD',
        }),
      }),
    );
  });

  it('never touches a subscription while granting credit', async () => {
    await service.activateFromVerifiedPayment(ACTIVATION);

    expect(tx.subscription.update).not.toHaveBeenCalled();
  });

  it('completes the checkout session so a replay short-circuits', async () => {
    await service.activateFromVerifiedPayment(ACTIVATION);

    expect(tx.checkoutSession.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'sess-1' },
        data: expect.objectContaining({ status: 'COMPLETED' }),
      }),
    );
  });

  it('reverses a charged-back top-up without revoking any plan entitlement', async () => {
    const applied = await service.reverseCreditTopup(REVERSAL);

    expect(applied).toBe(true);
    // ADR-064's revocation rule is about paid ACCESS. A top-up bought a balance,
    // so there is nothing to revoke — and revoking a plan the customer pays for
    // separately would be theft in the other direction.
    expect(tx.subscription.update).not.toHaveBeenCalled();
    expect(records.recordReversal).toHaveBeenCalledWith(
      tx,
      expect.objectContaining({
        subscriptionId: null,
        type: PaymentTransactionType.CHARGEBACK,
        reversesTransactionId: 'txn-1',
      }),
    );
  });

  it('enqueues the reversal event with the credit to claw back', async () => {
    await service.reverseCreditTopup(REVERSAL);

    expect(outbox.enqueue).toHaveBeenCalledWith(
      tx,
      expect.objectContaining({
        pattern: EventPattern.BILLING_CREDIT_TOPUP_REVERSED,
        aggregateId: 'txn-1',
        payloadJson: expect.objectContaining({
          userId: 'user-1',
          creditMicroUsd: '15000000',
          sourcePaymentTransactionId: 'txn-1',
          paymentTransactionId: 'rev-1',
          isChargeback: true,
        }),
      }),
    );
  });

  it('is a no-op when the provider reversal was already recorded', async () => {
    records.recordReversal.mockResolvedValue(null);

    const applied = await service.reverseCreditTopup(REVERSAL);

    expect(applied).toBe(false);
    // A redelivered chargeback must not debit the wallet twice.
    expect(outbox.enqueue).not.toHaveBeenCalled();
  });

  it('marks a refund reversal as not a chargeback', async () => {
    await service.reverseCreditTopup({ ...REVERSAL, type: PaymentTransactionType.REFUND });

    expect(outbox.enqueue).toHaveBeenCalledWith(
      tx,
      expect.objectContaining({
        payloadJson: expect.objectContaining({ isChargeback: false }),
      }),
    );
  });
});
