import { BillingGateway, CheckoutPurpose, CheckoutSessionStatus } from '@claw/shared-types';

import { PaypalCheckoutCompletionService } from '../paypal-checkout-completion.service';
import type { CheckoutSessionRepository } from '../../../billing/repositories/checkout-session.repository';
import type { PaypalAdapter } from '../../../gateways/paypal/paypal.adapter';
import type { PaymentCompensationService } from '../../../refunds/services/payment-compensation.service';
import type { PaymentActivationService } from '../../../webhooks/services/payment-activation.service';

const SESSION_ID = 'checkout-1';
const USER_ID = 'user-1';
const ORDER_ID = 'ORDER-1';
const STATE = 'a'.repeat(64);

function session(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: SESSION_ID,
    userId: USER_ID,
    purpose: CheckoutPurpose.NEW_SUBSCRIPTION,
    status: CheckoutSessionStatus.AWAITING_PAYMENT,
    gateway: BillingGateway.PAYPAL,
    planId: 'plan-starter',
    planSlug: 'starter',
    planPriceVersionId: 'price-1',
    billingInterval: 'MONTHLY',
    baseAmountMinor: 500,
    baseCurrency: 'USD',
    chargeAmountMinor: 500,
    chargeCurrency: 'USD',
    fxQuoteId: null,
    fxFinalRateScaled: null,
    providerOrderId: ORDER_ID,
    hostedCheckoutUrl: 'https://www.paypal.com/checkoutnow?token=ORDER-1',
    stateNonce: STATE,
    idempotencyKey: 'checkout-idempotency',
    billingEmail: 'buyer@example.com',
    expiresAt: new Date('2099-08-01T00:00:00.000Z'),
    subscriptionId: null,
    ...overrides,
  };
}

describe('PaypalCheckoutCompletionService', () => {
  const sessions = {
    findById: jest.fn(),
    claimForCapture: jest.fn(),
    markStatus: jest.fn(),
    markFailed: jest.fn(),
  };
  const paypal = {
    captureOrder: jest.fn(),
    getOrder: jest.fn(),
  };
  const activation = {
    activate: jest.fn(),
  };
  const compensation = {
    compensate: jest.fn(),
  };
  let service: PaypalCheckoutCompletionService;

  beforeEach(() => {
    jest.clearAllMocks();
    sessions.findById.mockResolvedValue(session());
    sessions.claimForCapture.mockResolvedValue(true);
    sessions.markStatus.mockImplementation(() => Promise.resolve());
    paypal.captureOrder.mockResolvedValue({
      verified: true,
      captureId: 'CAPTURE-1',
      status: 'COMPLETED',
      amountMinor: 500,
      currency: 'USD',
      checkoutSessionId: SESSION_ID,
      mismatchReason: null,
    });
    activation.activate.mockResolvedValue('subscription-1');
    service = new PaypalCheckoutCompletionService(
      sessions as unknown as CheckoutSessionRepository,
      paypal as unknown as PaypalAdapter,
      activation as unknown as PaymentActivationService,
      compensation as unknown as PaymentCompensationService,
    );
  });

  it('durably compensates a capture when subscription activation fails', async () => {
    activation.activate.mockRejectedValue(new Error('database failure'));
    compensation.compensate.mockImplementation(() => Promise.resolve());

    await expect(
      service.complete({
        userId: USER_ID,
        sessionId: SESSION_ID,
        state: STATE,
        providerOrderId: ORDER_ID,
      }),
    ).rejects.toThrow('database failure');

    expect(compensation.compensate).toHaveBeenCalledWith({
      checkoutSessionId: SESSION_ID,
      userId: USER_ID,
      gateway: BillingGateway.PAYPAL,
      providerTransactionId: 'CAPTURE-1',
      providerOrderId: ORDER_ID,
      amountMinor: 500,
      currency: 'USD',
      failureCode: 'PAYMENT_NOT_VERIFIED',
      reason: 'POST_CAPTURE_ACTIVATION_FAILURE',
    });
    expect(sessions.markFailed).toHaveBeenCalledWith(SESSION_ID, 'PAYMENT_NOT_VERIFIED');
  });

  it('claims before capture, verifies, and activates exactly once', async () => {
    const order: string[] = [];
    sessions.claimForCapture.mockImplementation(async () => {
      order.push('claim');
      return true;
    });
    paypal.captureOrder.mockImplementation(async () => {
      order.push('capture');
      return {
        verified: true,
        captureId: 'CAPTURE-1',
        status: 'COMPLETED',
        amountMinor: 500,
        currency: 'USD',
        checkoutSessionId: SESSION_ID,
        mismatchReason: null,
      };
    });

    await service.complete({
      userId: USER_ID,
      sessionId: SESSION_ID,
      state: STATE,
      providerOrderId: ORDER_ID,
    });

    expect(order).toEqual(['claim', 'capture']);
    expect(sessions.markStatus).toHaveBeenCalledWith(SESSION_ID, CheckoutSessionStatus.VERIFIED);
    expect(activation.activate).toHaveBeenCalledWith(
      expect.objectContaining({
        checkoutSessionId: SESSION_ID,
        providerTransactionId: 'CAPTURE-1',
        amountMinor: 500,
        currency: 'USD',
      }),
    );
  });

  it('does not reveal or capture a foreign session', async () => {
    sessions.findById.mockResolvedValue(session({ userId: 'someone-else' }));

    await expect(
      service.complete({
        userId: USER_ID,
        sessionId: SESSION_ID,
        state: STATE,
        providerOrderId: ORDER_ID,
      }),
    ).rejects.toMatchObject({ code: 'CHECKOUT_SESSION_NOT_FOUND' });
    expect(paypal.captureOrder).not.toHaveBeenCalled();
  });

  it('rejects a wrong state before claiming or contacting PayPal', async () => {
    await expect(
      service.complete({
        userId: USER_ID,
        sessionId: SESSION_ID,
        state: 'b'.repeat(64),
        providerOrderId: ORDER_ID,
      }),
    ).rejects.toMatchObject({ code: 'PAYMENT_REFERENCE_MISMATCH' });
    expect(sessions.claimForCapture).not.toHaveBeenCalled();
    expect(paypal.captureOrder).not.toHaveBeenCalled();
  });

  it('rejects an order substituted into another session', async () => {
    await expect(
      service.complete({
        userId: USER_ID,
        sessionId: SESSION_ID,
        state: STATE,
        providerOrderId: 'ORDER-ATTACKER',
      }),
    ).rejects.toMatchObject({ code: 'PAYMENT_REFERENCE_MISMATCH' });
    expect(paypal.captureOrder).not.toHaveBeenCalled();
  });

  it('returns a completed replay without capturing again', async () => {
    sessions.findById.mockResolvedValue(
      session({
        status: CheckoutSessionStatus.COMPLETED,
        subscriptionId: 'subscription-1',
      }),
    );

    await expect(
      service.complete({
        userId: USER_ID,
        sessionId: SESSION_ID,
        state: STATE,
        providerOrderId: ORDER_ID,
      }),
    ).resolves.toMatchObject({ status: CheckoutSessionStatus.COMPLETED });
    expect(sessions.claimForCapture).not.toHaveBeenCalled();
    expect(paypal.captureOrder).not.toHaveBeenCalled();
  });

  it('does not issue a second capture when another request owns the claim', async () => {
    sessions.claimForCapture.mockResolvedValue(false);

    await expect(
      service.complete({
        userId: USER_ID,
        sessionId: SESSION_ID,
        state: STATE,
        providerOrderId: ORDER_ID,
      }),
    ).resolves.toMatchObject({ id: SESSION_ID });
    expect(paypal.captureOrder).not.toHaveBeenCalled();
  });

  it('resolves an ambiguous capture by reading the order back', async () => {
    paypal.captureOrder.mockRejectedValue(new Error('connection reset'));
    paypal.getOrder.mockResolvedValue({
      verified: true,
      captureId: 'CAPTURE-1',
      status: 'COMPLETED',
      amountMinor: 500,
      currency: 'USD',
      checkoutSessionId: SESSION_ID,
      mismatchReason: null,
    });

    await service.complete({
      userId: USER_ID,
      sessionId: SESSION_ID,
      state: STATE,
      providerOrderId: ORDER_ID,
    });

    expect(paypal.getOrder).toHaveBeenCalledWith(
      ORDER_ID,
      expect.objectContaining({
        amountMinor: 500,
        currency: 'USD',
        checkoutSessionId: SESSION_ID,
      }),
    );
    expect(activation.activate).toHaveBeenCalledTimes(1);
  });

  it('records a stable failure when PayPal cannot verify the capture', async () => {
    paypal.captureOrder.mockResolvedValue({
      verified: false,
      captureId: null,
      status: 'APPROVED',
      amountMinor: null,
      currency: null,
      checkoutSessionId: null,
      mismatchReason: 'NO_CAPTURE',
    });

    await expect(
      service.complete({
        userId: USER_ID,
        sessionId: SESSION_ID,
        state: STATE,
        providerOrderId: ORDER_ID,
      }),
    ).rejects.toMatchObject({ code: 'PAYMENT_NOT_VERIFIED' });
    expect(sessions.markFailed).toHaveBeenCalledWith(SESSION_ID, 'PAYMENT_NOT_VERIFIED');
    expect(activation.activate).not.toHaveBeenCalled();
  });
});
