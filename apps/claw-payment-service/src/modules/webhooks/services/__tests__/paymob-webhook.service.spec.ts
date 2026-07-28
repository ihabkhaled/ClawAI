import { BillingGateway, CheckoutPurpose, CheckoutSessionStatus } from '@claw/shared-types';

import type { CheckoutSessionRepository } from '../../../billing/repositories/checkout-session.repository';
import type { PaymobAdapter } from '../../../gateways/paymob/paymob.adapter';
import type { PaymentCompensationService } from '../../../refunds/services/payment-compensation.service';
import type { WebhookEventRepository } from '../../repositories/webhook-event.repository';
import { WebhookOutcome } from '../../types/webhook.types';
import type { PaymentActivationService } from '../payment-activation.service';
import { PaymobWebhookService } from '../paymob-webhook.service';

const TRANSACTION_ID = '123456';
const SESSION_ID = 'checkout-1';

function callbackBody(): string {
  return JSON.stringify({
    obj: {
      id: TRANSACTION_ID,
      order: { merchant_order_id: SESSION_ID },
    },
  });
}

describe('PaymobWebhookService', () => {
  const paymob = {
    verifyCallback: jest.fn(),
    fetchTransaction: jest.fn(),
  };
  const events = {
    claim: jest.fn(),
    markFailed: jest.fn(),
    markProcessed: jest.fn(),
    markProcessing: jest.fn(),
    recordInvalidSignature: jest.fn(),
  };
  const sessions = {
    findById: jest.fn(),
    markFailed: jest.fn(),
  };
  const activation = { activate: jest.fn() };
  const compensation = { compensate: jest.fn() };
  let service: PaymobWebhookService;

  beforeEach(() => {
    jest.clearAllMocks();
    events.claim.mockResolvedValue({ id: 'event-1' });
    paymob.verifyCallback.mockReturnValue({
      verified: true,
      transactionId: TRANSACTION_ID,
      amountMinor: 10,
      currency: 'EGP',
      checkoutSessionId: SESSION_ID,
      mismatchReason: null,
    });
    paymob.fetchTransaction.mockResolvedValue({
      verified: true,
      transactionId: TRANSACTION_ID,
      amountMinor: 10,
      currency: 'EGP',
      checkoutSessionId: SESSION_ID,
      mismatchReason: null,
    });
    compensation.compensate.mockImplementation(() => Promise.resolve());
    service = new PaymobWebhookService(
      paymob as unknown as PaymobAdapter,
      events as unknown as WebhookEventRepository,
      sessions as unknown as CheckoutSessionRepository,
      activation as unknown as PaymentActivationService,
      compensation as unknown as PaymentCompensationService,
    );
  });

  it('verifies and refunds the Paymob payment-method verification charge', async () => {
    sessions.findById.mockResolvedValue({
      id: SESSION_ID,
      userId: 'user-1',
      purpose: CheckoutPurpose.PAYMENT_METHOD_SETUP,
      status: CheckoutSessionStatus.AWAITING_PAYMENT,
      gateway: BillingGateway.PAYMOB,
      providerOrderId: 'intention-1',
      chargeAmountMinor: 10,
      chargeCurrency: 'EGP',
    });

    await expect(service.handle(callbackBody(), 'valid-hmac')).resolves.toMatchObject({
      outcome: WebhookOutcome.PROCESSED,
      transactionId: TRANSACTION_ID,
    });

    expect(paymob.verifyCallback).toHaveBeenCalledWith(expect.any(Object), 'valid-hmac', {
      amountMinor: 10,
      currency: 'EGP',
      checkoutSessionId: SESSION_ID,
    });
    expect(compensation.compensate).toHaveBeenCalledWith({
      checkoutSessionId: SESSION_ID,
      userId: 'user-1',
      gateway: BillingGateway.PAYMOB,
      providerTransactionId: TRANSACTION_ID,
      providerOrderId: 'intention-1',
      amountMinor: 10,
      currency: 'EGP',
      failureCode: 'PAYMENT_METHOD_VERIFICATION_CHARGE',
      reason: 'PAYMENT_METHOD_VERIFICATION_CHARGE',
    });
    expect(activation.activate).not.toHaveBeenCalled();
  });

  it('compensates a verified subscription charge when activation fails', async () => {
    sessions.findById.mockResolvedValue({
      id: SESSION_ID,
      userId: 'user-1',
      purpose: CheckoutPurpose.NEW_SUBSCRIPTION,
      status: CheckoutSessionStatus.AWAITING_PAYMENT,
      gateway: BillingGateway.PAYMOB,
      planId: 'plan-1',
      planSlug: 'starter',
      planPriceVersionId: 'price-1',
      billingInterval: 'MONTHLY',
      baseAmountMinor: 500,
      baseCurrency: 'USD',
      chargeAmountMinor: 10,
      chargeCurrency: 'EGP',
      providerOrderId: 'intention-1',
    });
    activation.activate.mockRejectedValue(new Error('database failure'));

    await expect(service.handle(callbackBody(), 'valid-hmac')).rejects.toThrow('database failure');

    expect(compensation.compensate).toHaveBeenCalledWith(
      expect.objectContaining({
        checkoutSessionId: SESSION_ID,
        gateway: BillingGateway.PAYMOB,
        providerTransactionId: TRANSACTION_ID,
        amountMinor: 10,
        currency: 'EGP',
        reason: 'POST_CAPTURE_ACTIVATION_FAILURE',
      }),
    );
  });
});
