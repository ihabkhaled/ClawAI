import {
  BillingGateway,
  EventPattern,
  PaymentTransactionType,
  SubscriptionStatus,
} from '@claw/shared-types';

import { PaymentReversalService } from '../payment-reversal.service';

describe('PaymentReversalService', () => {
  const lifecycle = { reverseAndRevoke: jest.fn() };
  const refundWebhooks = { apply: jest.fn() };
  const service = new PaymentReversalService(lifecycle as never, refundWebhooks as never);
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
});
