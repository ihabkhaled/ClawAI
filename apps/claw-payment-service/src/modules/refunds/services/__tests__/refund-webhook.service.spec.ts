import { BillingErrorCode, BillingGateway } from '@claw/shared-types';

import { RefundStatus } from '../../../../generated/prisma';
import { RefundWebhookService } from '../refund-webhook.service';

describe('RefundWebhookService', () => {
  const charge = {
    id: 'charge-1',
    userId: 'user-1',
    subscriptionId: 'subscription-1',
    gateway: BillingGateway.PAYPAL,
    amountMinor: 10_000,
    currency: 'USD',
    providerTransactionId: 'capture-1',
  };
  const request = {
    originalTransactionId: charge.id,
    subscriptionId: charge.subscriptionId,
    userId: charge.userId,
    gateway: BillingGateway.PAYPAL,
    amountMinor: 2_500,
    currency: 'USD',
    providerAmountMinor: 2_500,
    providerCurrency: 'USD',
    providerTransactionId: 'provider-refund-1',
    invoiceId: null,
    correlationId: 'webhook-event-1',
  };
  const reservation = {
    id: 'refund-1',
    providerRefundId: null,
    status: RefundStatus.PENDING,
  };
  const repository = {
    findByProviderRefundId: jest.fn(),
    findCapturedCharge: jest.fn(),
    reserve: jest.fn(),
  };
  const completion = { complete: jest.fn() };
  let service: RefundWebhookService;

  beforeEach(() => {
    jest.clearAllMocks();
    repository.findByProviderRefundId.mockResolvedValue(null);
    repository.findCapturedCharge.mockResolvedValue(charge);
    repository.reserve.mockResolvedValue(reservation);
    completion.complete.mockResolvedValue({ ...reservation, status: RefundStatus.SUCCEEDED });
    service = new RefundWebhookService(repository as never, completion as never);
  });

  it('converges a verified provider webhook through the same persisted completion path', async () => {
    await expect(service.apply(request)).resolves.toBe(true);

    expect(repository.reserve).toHaveBeenCalledWith(
      expect.objectContaining({
        paymentTransactionId: 'charge-1',
        amountMinor: 2_500,
        providerIdempotencyKey: 'provider-refund-1',
      }),
    );
    expect(completion.complete).toHaveBeenCalledWith(
      'refund-1',
      'provider-refund-1',
      'webhook-event-1',
    );
  });

  it('treats a redelivered completed provider refund as a duplicate', async () => {
    repository.findByProviderRefundId.mockResolvedValueOnce({
      ...reservation,
      status: RefundStatus.SUCCEEDED,
      providerRefundId: 'provider-refund-1',
    });

    await expect(service.apply(request)).resolves.toBe(false);
    expect(repository.reserve).not.toHaveBeenCalled();
    expect(completion.complete).not.toHaveBeenCalled();
  });

  it('rejects a provider currency that does not match the captured charge', async () => {
    await expect(service.apply({ ...request, currency: 'EUR' })).rejects.toMatchObject({
      code: BillingErrorCode.PAYMENT_REFERENCE_MISMATCH,
    });
    expect(repository.reserve).not.toHaveBeenCalled();
    expect(completion.complete).not.toHaveBeenCalled();
  });

  it('resumes an existing pending refund without reserving a second row', async () => {
    repository.findByProviderRefundId.mockResolvedValueOnce({
      ...reservation,
      providerRefundId: 'provider-refund-1',
    });

    await expect(service.apply(request)).resolves.toBe(true);
    expect(repository.reserve).not.toHaveBeenCalled();
    expect(completion.complete).toHaveBeenCalledWith(
      'refund-1',
      'provider-refund-1',
      'webhook-event-1',
    );
  });

  it('uses the verified webhook correlation when the provider omits a refund identifier', async () => {
    await expect(service.apply({ ...request, providerTransactionId: null })).resolves.toBe(true);

    expect(repository.findByProviderRefundId).toHaveBeenCalledWith(
      BillingGateway.PAYPAL,
      'webhook-event-1',
    );
    expect(repository.reserve).toHaveBeenCalledWith(
      expect.objectContaining({
        idempotencyKey: 'webhook:webhook-event-1',
        providerIdempotencyKey: 'webhook-event-1',
      }),
    );
    expect(completion.complete).toHaveBeenCalledWith(
      'refund-1',
      'webhook-event-1',
      'webhook-event-1',
    );
  });

  it('rejects a refund whose original captured charge cannot be found', async () => {
    repository.findCapturedCharge.mockResolvedValueOnce(null);

    await expect(service.apply(request)).rejects.toMatchObject({
      code: BillingErrorCode.PAYMENT_REFERENCE_MISMATCH,
    });
    expect(repository.reserve).not.toHaveBeenCalled();
    expect(completion.complete).not.toHaveBeenCalled();
  });

  it.each([
    { subscriptionId: 'subscription-other' },
    { userId: 'user-other' },
    { gateway: BillingGateway.PAYMOB },
  ])('rejects a provider ownership mismatch: %o', async (mismatch) => {
    await expect(service.apply({ ...request, ...mismatch })).rejects.toMatchObject({
      code: BillingErrorCode.PAYMENT_REFERENCE_MISMATCH,
    });
    expect(repository.reserve).not.toHaveBeenCalled();
    expect(completion.complete).not.toHaveBeenCalled();
  });
});
