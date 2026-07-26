import { BillingGateway } from '@claw/shared-types';

import { PaypalWebhookService } from '../paypal-webhook.service';
import { WebhookOutcome } from '../../types/webhook.types';
import type { CheckoutSessionRepository } from '../../../billing/repositories/checkout-session.repository';
import type { PaypalAdapter } from '../../../gateways/paypal/paypal.adapter';
import type { PaymentActivationService } from '../payment-activation.service';
import type { WebhookEventRepository } from '../../repositories/webhook-event.repository';

const HEADERS = {
  transmissionId: 't-1',
  transmissionTime: '2026-07-26T00:00:00Z',
  transmissionSig: 'sig',
  certUrl: 'https://api.paypal.com/cert',
  authAlgo: 'SHA256withRSA',
};

function captureBody(overrides: Record<string, unknown> = {}): string {
  return JSON.stringify({
    id: 'WH-1',
    event_type: 'PAYMENT.CAPTURE.COMPLETED',
    resource: { custom_id: 'cs-1', amount: { value: '19.99', currency_code: 'USD' } },
    ...overrides,
  });
}

describe('PaypalWebhookService', () => {
  let paypal: { verifyWebhookSignature: jest.Mock; getOrder: jest.Mock };
  let events: {
    claim: jest.Mock;
    recordInvalidSignature: jest.Mock;
    markProcessing: jest.Mock;
    markProcessed: jest.Mock;
    markFailed: jest.Mock;
    markIgnored: jest.Mock;
  };
  let sessions: { findById: jest.Mock };
  let activation: { activate: jest.Mock };
  let service: PaypalWebhookService;

  beforeEach(() => {
    paypal = {
      verifyWebhookSignature: jest.fn().mockResolvedValue(true),
      getOrder: jest.fn().mockResolvedValue({
        verified: true,
        captureId: 'CAP-1',
        status: 'COMPLETED',
        amountMinor: 1999,
        currency: 'USD',
        checkoutSessionId: 'cs-1',
        mismatchReason: null,
      }),
    };
    events = {
      claim: jest.fn().mockResolvedValue({ id: 'we-1' }),
      recordInvalidSignature: jest.fn(),
      markProcessing: jest.fn(),
      markProcessed: jest.fn(),
      markFailed: jest.fn(),
      markIgnored: jest.fn(),
    };
    sessions = {
      findById: jest.fn().mockResolvedValue({
        id: 'cs-1',
        providerOrderId: 'PP-ORDER-1',
        chargeAmountMinor: 1999,
        chargeCurrency: 'USD',
      }),
    };
    activation = { activate: jest.fn().mockResolvedValue('sub-1') };

    service = new PaypalWebhookService(
      paypal as unknown as PaypalAdapter,
      events as unknown as WebhookEventRepository,
      sessions as unknown as CheckoutSessionRepository,
      activation as unknown as PaymentActivationService,
    );
  });

  it('activates on a verified capture', async () => {
    const result = await service.handle(captureBody(), HEADERS);

    expect(result.outcome).toBe(WebhookOutcome.PROCESSED);
    expect(activation.activate).toHaveBeenCalledWith(
      expect.objectContaining({ checkoutSessionId: 'cs-1', providerTransactionId: 'CAP-1' }),
    );
    expect(events.markProcessed).toHaveBeenCalledWith('we-1', 'sub-1', 'CAP-1');
  });

  it('refuses to act on an invalid signature, and records the attempt', async () => {
    paypal.verifyWebhookSignature.mockResolvedValue(false);

    const result = await service.handle(captureBody(), HEADERS);

    expect(result.outcome).toBe(WebhookOutcome.SIGNATURE_INVALID);
    expect(activation.activate).not.toHaveBeenCalled();
    // Recorded, not silently dropped — a forgery attempt is a security signal.
    expect(events.recordInvalidSignature).toHaveBeenCalledWith(
      expect.objectContaining({ gateway: BillingGateway.PAYPAL, signatureValid: false }),
    );
    // And never claimed as a real event.
    expect(events.claim).not.toHaveBeenCalled();
  });

  it('verifies the signature before claiming the event', async () => {
    const order: string[] = [];
    paypal.verifyWebhookSignature.mockImplementation(async () => {
      order.push('verify');
      return true;
    });
    events.claim.mockImplementation(async () => {
      order.push('claim');
      return { id: 'we-1' };
    });

    await service.handle(captureBody(), HEADERS);

    expect(order).toEqual(['verify', 'claim']);
  });

  it('reads the order back from PayPal rather than trusting the webhook amount', async () => {
    // The body claims $999.99. Nothing in the activation path may come from it.
    await service.handle(
      captureBody({
        resource: { custom_id: 'cs-1', amount: { value: '999.99', currency_code: 'USD' } },
      }),
      HEADERS,
    );

    expect(paypal.getOrder).toHaveBeenCalledWith(
      'PP-ORDER-1',
      expect.objectContaining({ amountMinor: 1999, currency: 'USD' }),
    );
    expect(activation.activate).toHaveBeenCalledWith(
      expect.objectContaining({ amountMinor: 1999 }),
    );
  });

  it('treats a duplicate delivery as a no-op', async () => {
    events.claim.mockResolvedValue(null);

    const result = await service.handle(captureBody(), HEADERS);

    expect(result.outcome).toBe(WebhookOutcome.DUPLICATE);
    expect(activation.activate).not.toHaveBeenCalled();
  });

  it('ignores an event type it does not handle', async () => {
    const result = await service.handle(
      captureBody({ event_type: 'BILLING.SUBSCRIPTION.RE-ACTIVATED' }),
      HEADERS,
    );

    expect(result.outcome).toBe(WebhookOutcome.IGNORED);
    expect(events.markIgnored).toHaveBeenCalledWith('we-1');
    expect(activation.activate).not.toHaveBeenCalled();
  });

  it('does not activate when PayPal reports the order as unverified', async () => {
    paypal.getOrder.mockResolvedValue({
      verified: false,
      captureId: null,
      status: 'PENDING',
      amountMinor: null,
      currency: null,
      checkoutSessionId: 'cs-1',
      mismatchReason: 'AMOUNT_MISMATCH',
    });

    const result = await service.handle(captureBody(), HEADERS);

    expect(result.outcome).toBe(WebhookOutcome.FAILED);
    expect(activation.activate).not.toHaveBeenCalled();
    expect(events.markFailed).toHaveBeenCalledWith('we-1', 'PAYMENT_NOT_VERIFIED');
  });

  it('fails cleanly when the capture names no session', async () => {
    const result = await service.handle(
      captureBody({ resource: { amount: { value: '19.99', currency_code: 'USD' } } }),
      HEADERS,
    );

    expect(result.outcome).toBe(WebhookOutcome.FAILED);
    expect(events.markFailed).toHaveBeenCalledWith('we-1', 'PAYMENT_REFERENCE_MISMATCH');
  });

  it('ignores an unparseable body instead of throwing', async () => {
    // A gateway retries a 5xx forever. A malformed body must terminate.
    const result = await service.handle('not json at all', HEADERS);

    expect(result.outcome).toBe(WebhookOutcome.IGNORED);
    expect(events.claim).not.toHaveBeenCalled();
  });

  it('ignores a body whose event id is absurdly long', async () => {
    const result = await service.handle(captureBody({ id: 'x'.repeat(500) }), HEADERS);

    expect(result.outcome).toBe(WebhookOutcome.IGNORED);
  });

  it('hashes the payload rather than storing it', async () => {
    paypal.verifyWebhookSignature.mockResolvedValue(false);
    const body = captureBody();

    await service.handle(body, HEADERS);

    const recorded = events.recordInvalidSignature.mock.calls[0]?.[0] as {
      payloadHash: string;
    };
    // A SHA-256 hex digest, and nothing resembling the payer-bearing body.
    expect(recorded.payloadHash).toMatch(/^[a-f0-9]{64}$/);
    expect(JSON.stringify(recorded)).not.toContain('custom_id');
  });
});
