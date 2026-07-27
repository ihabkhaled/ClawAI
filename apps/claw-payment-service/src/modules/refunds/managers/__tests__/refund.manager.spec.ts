import { BillingErrorCode, BillingGateway } from '@claw/shared-types';

import { RefundManager } from '../refund.manager';

describe('RefundManager', () => {
  const charge = {
    id: 'charge-1',
    userId: 'customer-1',
    subscriptionId: 'subscription-1',
    gateway: BillingGateway.PAYPAL,
    amountMinor: 10_000,
    currency: 'USD',
    providerTransactionId: 'capture-1',
  };
  const reservation = {
    id: 'refund-1',
    paymentTransactionId: charge.id,
    subscriptionId: charge.subscriptionId,
    invoiceId: null,
    userId: charge.userId,
    requestedByUserId: 'admin-1',
    gateway: charge.gateway,
    status: 'PENDING',
    amountMinor: 4_000,
    currency: charge.currency,
    idempotencyKey: 'refund-request-1',
    providerIdempotencyKey: 'provider-key-1',
    providerRefundId: null,
    reason: 'Customer request',
    failureCode: null,
    completedAt: null,
    createdAt: new Date('2026-07-27T00:00:00.000Z'),
    updatedAt: new Date('2026-07-27T00:00:00.000Z'),
  };
  const repository = {
    findByIdempotencyKey: jest.fn(),
    findCapturedCharge: jest.fn(),
    listReservedAmounts: jest.fn(),
    reserve: jest.fn(),
    markProviderAccepted: jest.fn(),
    markFailed: jest.fn(),
  };
  const paypal = { refundCapture: jest.fn() };
  const paymob = { refund: jest.fn() };
  const completion = { complete: jest.fn() };
  let manager: RefundManager;

  beforeEach(() => {
    jest.clearAllMocks();
    repository.findByIdempotencyKey.mockResolvedValue(null);
    repository.findCapturedCharge.mockResolvedValue(charge);
    repository.listReservedAmounts.mockResolvedValue([1_000]);
    repository.reserve.mockResolvedValue(reservation);
    repository.markProviderAccepted.mockResolvedValue(reservation);
    paypal.refundCapture.mockResolvedValue({ refundId: 'provider-refund-1', status: 'COMPLETED' });
    completion.complete.mockResolvedValue({ ...reservation, status: 'SUCCEEDED' });
    manager = new RefundManager(
      repository as never,
      paypal as never,
      paymob as never,
      completion as never,
    );
  });

  it('reserves balance before calling PayPal and completes with a provider idempotency key', async () => {
    await expect(
      manager.request({
        requestedByUserId: 'admin-1',
        paymentTransactionId: charge.id,
        amountMinor: 4_000,
        idempotencyKey: 'refund-request-1',
        reason: 'Customer request',
      }),
    ).resolves.toEqual(expect.objectContaining({ status: 'SUCCEEDED' }));

    expect(repository.reserve.mock.invocationCallOrder[0]).toBeLessThan(
      paypal.refundCapture.mock.invocationCallOrder[0] ?? 0,
    );
    expect(paypal.refundCapture).toHaveBeenCalledWith('capture-1', 4_000, 'USD', 'provider-key-1');
    expect(completion.complete).toHaveBeenCalledWith(
      'refund-1',
      'provider-refund-1',
      'refund-request-1',
    );
  });

  it('returns the original refund without making another provider call on an idempotent replay', async () => {
    repository.findByIdempotencyKey.mockResolvedValueOnce(reservation);

    await manager.request({
      requestedByUserId: 'admin-1',
      paymentTransactionId: charge.id,
      amountMinor: 4_000,
      idempotencyKey: 'refund-request-1',
      reason: 'Customer request',
    });

    expect(repository.findCapturedCharge).not.toHaveBeenCalled();
    expect(paypal.refundCapture).not.toHaveBeenCalled();
  });

  it('rejects reuse of an idempotency key with a different payload', async () => {
    repository.findByIdempotencyKey.mockResolvedValueOnce(reservation);

    await expect(
      manager.request({
        requestedByUserId: 'admin-1',
        paymentTransactionId: charge.id,
        amountMinor: 4_001,
        idempotencyKey: 'refund-request-1',
        reason: 'Customer request',
      }),
    ).rejects.toMatchObject({ code: BillingErrorCode.IDEMPOTENCY_KEY_REUSED });
    expect(paypal.refundCapture).not.toHaveBeenCalled();
  });

  it('rejects an over-refund before reserving or calling a gateway', async () => {
    repository.listReservedAmounts.mockResolvedValueOnce([7_000]);

    await expect(
      manager.request({
        requestedByUserId: 'admin-1',
        paymentTransactionId: charge.id,
        amountMinor: 4_000,
        idempotencyKey: 'refund-request-2',
        reason: 'Customer request',
      }),
    ).rejects.toMatchObject({
      code: BillingErrorCode.REFUND_AMOUNT_EXCEEDS_REMAINING,
    });
    expect(repository.reserve).not.toHaveBeenCalled();
    expect(paypal.refundCapture).not.toHaveBeenCalled();
  });

  it('rejects a transaction whose captured balance is already fully reserved', async () => {
    repository.listReservedAmounts.mockResolvedValueOnce([10_000]);

    await expect(
      manager.request({
        requestedByUserId: 'admin-1',
        paymentTransactionId: charge.id,
        amountMinor: 1,
        idempotencyKey: 'refund-request-after-full',
        reason: 'Customer request',
      }),
    ).rejects.toMatchObject({
      code: BillingErrorCode.REFUND_AMOUNT_EXCEEDS_REMAINING,
    });
    expect(repository.reserve).not.toHaveBeenCalled();
  });

  it('marks the reservation failed with a stable code when the provider refuses it', async () => {
    paypal.refundCapture.mockRejectedValueOnce(new Error('private provider response'));

    await expect(
      manager.request({
        requestedByUserId: 'admin-1',
        paymentTransactionId: charge.id,
        amountMinor: 4_000,
        idempotencyKey: 'refund-request-3',
        reason: 'Customer request',
      }),
    ).rejects.toThrow();
    expect(repository.markFailed).toHaveBeenCalledWith(
      'refund-1',
      BillingErrorCode.GATEWAY_UNAVAILABLE,
    );
  });

  it('keeps an accepted asynchronous PayPal refund pending for webhook completion', async () => {
    paypal.refundCapture.mockResolvedValueOnce({
      refundId: 'provider-refund-pending',
      status: 'PENDING',
    });

    await manager.request({
      requestedByUserId: 'admin-1',
      paymentTransactionId: charge.id,
      amountMinor: 4_000,
      idempotencyKey: 'refund-request-pending',
      reason: 'Customer request',
    });

    expect(repository.markProviderAccepted).toHaveBeenCalledWith(
      'refund-1',
      'provider-refund-pending',
    );
    expect(completion.complete).not.toHaveBeenCalled();
  });

  it('routes Paymob refunds with the provider idempotency key', async () => {
    const paymobCharge = {
      ...charge,
      gateway: BillingGateway.PAYMOB,
      providerTransactionId: 'paymob-transaction-1',
    };
    const paymobReservation = { ...reservation, gateway: BillingGateway.PAYMOB };
    repository.findCapturedCharge.mockResolvedValueOnce(paymobCharge);
    repository.reserve.mockResolvedValueOnce(paymobReservation);
    paymob.refund.mockResolvedValueOnce({ refundId: 'paymob-refund-1' });

    await manager.request({
      requestedByUserId: 'admin-1',
      paymentTransactionId: charge.id,
      amountMinor: 4_000,
      idempotencyKey: 'refund-request-paymob',
      reason: 'Customer request',
    });

    expect(paymob.refund).toHaveBeenCalledWith('paymob-transaction-1', 4_000, 'provider-key-1');
    expect(completion.complete).toHaveBeenCalledWith(
      'refund-1',
      'paymob-refund-1',
      'refund-request-paymob',
    );
  });

  it('rejects fractional minor units before reading a charge', async () => {
    await expect(
      manager.request({
        requestedByUserId: 'admin-1',
        paymentTransactionId: charge.id,
        amountMinor: 1.5,
        idempotencyKey: 'refund-request-invalid',
        reason: 'Customer request',
      }),
    ).rejects.toMatchObject({ code: BillingErrorCode.REFUND_AMOUNT_INVALID });
    expect(repository.findCapturedCharge).not.toHaveBeenCalled();
  });
});
