import { BillingGateway } from '@claw/shared-types';

import { RefundStatus } from '../../../../generated/prisma';
import { PaymentCompensationService } from '../payment-compensation.service';

describe('PaymentCompensationService', () => {
  const repository = {
    markAutomaticAttemptFailed: jest.fn(),
    markProviderAccepted: jest.fn(),
    prepareAutomaticCompensation: jest.fn(),
  };
  const paypal = { refundCapture: jest.fn() };
  const paymob = { refund: jest.fn() };
  const completion = { complete: jest.fn() };
  const baseRefund = {
    id: 'refund-1',
    status: RefundStatus.PENDING,
    gateway: BillingGateway.PAYPAL,
    providerAmountMinor: 500,
    providerCurrency: 'USD',
    providerIdempotencyKey: 'auto-refund:checkout-1',
    providerRefundId: null,
  };
  const input = {
    checkoutSessionId: 'checkout-1',
    userId: 'user-1',
    gateway: BillingGateway.PAYPAL,
    providerTransactionId: 'capture-1',
    providerOrderId: 'order-1',
    amountMinor: 500,
    currency: 'USD',
    failureCode: 'ACTIVATION_FAILED',
    reason: 'POST_CAPTURE_ACTIVATION_FAILURE',
  };
  let service: PaymentCompensationService;

  beforeEach(() => {
    jest.clearAllMocks();
    repository.prepareAutomaticCompensation.mockResolvedValue({
      refund: baseRefund,
      providerTransactionId: 'capture-1',
      checkoutSessionId: 'checkout-1',
    });
    repository.markProviderAccepted.mockImplementation(
      async (_id: string, providerRefundId: string) => ({
        ...baseRefund,
        providerRefundId,
      }),
    );
    paypal.refundCapture.mockResolvedValue({ refundId: 'paypal-refund-1', status: 'COMPLETED' });
    paymob.refund.mockResolvedValue({ refundId: 'paymob-refund-1' });
    completion.complete.mockResolvedValue({ ...baseRefund, status: RefundStatus.SUCCEEDED });
    service = new PaymentCompensationService(
      repository as never,
      paypal as never,
      paymob as never,
      completion as never,
    );
  });

  it('reserves the ledger before issuing and completing a PayPal refund', async () => {
    await service.compensate(input);

    expect(repository.prepareAutomaticCompensation).toHaveBeenCalledWith(input);
    expect(paypal.refundCapture).toHaveBeenCalledWith(
      'capture-1',
      500,
      'USD',
      'auto-refund:checkout-1',
    );
    expect(completion.complete).toHaveBeenCalledWith(
      'refund-1',
      'paypal-refund-1',
      'compensation:checkout-1',
    );
  });

  it('refunds a Paymob capture using provider minor units', async () => {
    repository.prepareAutomaticCompensation.mockResolvedValue({
      refund: { ...baseRefund, gateway: BillingGateway.PAYMOB, providerCurrency: 'EGP' },
      providerTransactionId: 'paymob-transaction-1',
      checkoutSessionId: 'checkout-1',
    });

    await service.compensate({
      ...input,
      gateway: BillingGateway.PAYMOB,
      providerTransactionId: 'paymob-transaction-1',
      currency: 'EGP',
    });

    expect(paymob.refund).toHaveBeenCalledWith(
      'paymob-transaction-1',
      500,
      'auto-refund:checkout-1',
    );
    expect(completion.complete).toHaveBeenCalledWith(
      'refund-1',
      'paymob-refund-1',
      'compensation:checkout-1',
    );
  });

  it('keeps a failed automatic refund retryable and durably records the attempt', async () => {
    paypal.refundCapture.mockRejectedValue(new Error('provider unavailable'));

    await expect(service.compensate(input)).rejects.toThrow();

    expect(repository.markAutomaticAttemptFailed).toHaveBeenCalledWith(
      'refund-1',
      'GATEWAY_UNAVAILABLE',
    );
    expect(completion.complete).not.toHaveBeenCalled();
  });

  it('does not issue another provider refund after compensation succeeded', async () => {
    repository.prepareAutomaticCompensation.mockResolvedValue({
      refund: { ...baseRefund, status: RefundStatus.SUCCEEDED },
      providerTransactionId: 'capture-1',
      checkoutSessionId: 'checkout-1',
    });

    await service.compensate(input);

    expect(paypal.refundCapture).not.toHaveBeenCalled();
    expect(paymob.refund).not.toHaveBeenCalled();
  });
});
