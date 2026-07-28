import {
  BillingErrorCode,
  BillingGateway,
  CheckoutPurpose,
  CheckoutSessionStatus,
} from '@claw/shared-types';

import { PaymobCheckoutCompletionService } from '../paymob-checkout-completion.service';
import type { CheckoutSessionRepository } from '../../../billing/repositories/checkout-session.repository';
import type { PaymobAdapter } from '../../../gateways/paymob/paymob.adapter';
import type { PaymentCompensationService } from '../../../refunds/services/payment-compensation.service';
import type { PaymentActivationService } from '../../../webhooks/services/payment-activation.service';

const session = (overrides: Record<string, unknown> = {}): Record<string, unknown> => ({
  id: 'checkout-1',
  userId: 'user-1',
  purpose: CheckoutPurpose.NEW_SUBSCRIPTION,
  status: CheckoutSessionStatus.AWAITING_PAYMENT,
  gateway: BillingGateway.PAYMOB,
  chargeAmountMinor: 103,
  chargeCurrency: 'EGP',
  providerOrderId: '575143140',
  subscriptionId: null,
  ...overrides,
});

describe('PaymobCheckoutCompletionService', () => {
  const sessions = {
    findById: jest.fn(),
    markFailed: jest.fn(),
  };
  const paymob = {
    fetchTransactionByReference: jest.fn(),
  };
  const activation = {
    activate: jest.fn(),
  };
  const compensation = {
    compensate: jest.fn(),
  };
  let service: PaymobCheckoutCompletionService;

  beforeEach(() => {
    jest.clearAllMocks();
    sessions.findById.mockResolvedValue(session());
    paymob.fetchTransactionByReference.mockResolvedValue({
      verified: true,
      transactionId: '504310881',
      amountMinor: 103,
      currency: 'EGP',
      checkoutSessionId: 'checkout-1',
      mismatchReason: null,
    });
    activation.activate.mockResolvedValue('subscription-1');
    service = new PaymobCheckoutCompletionService(
      sessions as unknown as CheckoutSessionRepository,
      paymob as unknown as PaymobAdapter,
      activation as unknown as PaymentActivationService,
      compensation as unknown as PaymentCompensationService,
    );
  });

  it('activates only after authoritative inquiry by the immutable session reference', async () => {
    await expect(service.complete({ userId: 'user-1', sessionId: 'checkout-1' })).resolves.toEqual({
      status: CheckoutSessionStatus.COMPLETED,
      subscriptionId: 'subscription-1',
      paymentMethodPending: false,
    });

    expect(paymob.fetchTransactionByReference).toHaveBeenCalledWith('checkout-1', {
      amountMinor: 103,
      currency: 'EGP',
      checkoutSessionId: 'checkout-1',
    });
    expect(activation.activate).toHaveBeenCalledWith({
      checkoutSessionId: 'checkout-1',
      providerTransactionId: '504310881',
      amountMinor: 103,
      currency: 'EGP',
      correlationId: 'paymob-return:504310881',
    });
  });

  it('hides another user session as not found before any provider call', async () => {
    sessions.findById.mockResolvedValue(session({ userId: 'another-user' }));

    await expect(
      service.complete({ userId: 'user-1', sessionId: 'checkout-1' }),
    ).rejects.toMatchObject({ code: BillingErrorCode.CHECKOUT_SESSION_NOT_FOUND });
    expect(paymob.fetchTransactionByReference).not.toHaveBeenCalled();
  });

  it('refunds a verified setup charge while waiting for the signed card-token callback', async () => {
    sessions.findById.mockResolvedValue(
      session({ purpose: CheckoutPurpose.PAYMENT_METHOD_SETUP, chargeAmountMinor: 10 }),
    );
    paymob.fetchTransactionByReference.mockResolvedValue({
      verified: true,
      transactionId: '504309062',
      amountMinor: 10,
      currency: 'EGP',
      checkoutSessionId: 'checkout-1',
      mismatchReason: null,
    });

    await expect(
      service.complete({ userId: 'user-1', sessionId: 'checkout-1' }),
    ).resolves.toMatchObject({
      paymentMethodPending: true,
      subscriptionId: null,
    });

    expect(compensation.compensate).toHaveBeenCalledWith(
      expect.objectContaining({
        checkoutSessionId: 'checkout-1',
        providerTransactionId: '504309062',
        failureCode: 'PAYMENT_METHOD_VERIFICATION_CHARGE',
      }),
    );
    expect(activation.activate).not.toHaveBeenCalled();
  });

  it('refuses an unverified provider result', async () => {
    paymob.fetchTransactionByReference.mockResolvedValue({
      verified: false,
      transactionId: '504310881',
      amountMinor: null,
      currency: null,
      checkoutSessionId: null,
      mismatchReason: 'AMOUNT_MISMATCH',
    });

    await expect(
      service.complete({ userId: 'user-1', sessionId: 'checkout-1' }),
    ).rejects.toMatchObject({ code: BillingErrorCode.PAYMENT_NOT_VERIFIED });
    expect(sessions.markFailed).toHaveBeenCalledWith(
      'checkout-1',
      BillingErrorCode.PAYMENT_NOT_VERIFIED,
    );
    expect(activation.activate).not.toHaveBeenCalled();
  });

  it('refunds a verified charge if local activation fails', async () => {
    activation.activate.mockRejectedValue(new Error('database failure'));

    await expect(service.complete({ userId: 'user-1', sessionId: 'checkout-1' })).rejects.toThrow(
      'database failure',
    );

    expect(compensation.compensate).toHaveBeenCalledWith(
      expect.objectContaining({
        checkoutSessionId: 'checkout-1',
        providerTransactionId: '504310881',
        reason: 'POST_CAPTURE_ACTIVATION_FAILURE',
      }),
    );
  });
});
