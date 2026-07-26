import { BillingGateway } from '@claw/shared-types';

import { PaypalWebhookService } from '../paypal-webhook.service';
import { WebhookOutcome } from '../../types/webhook.types';
import type { CheckoutSessionRepository } from '../../../billing/repositories/checkout-session.repository';
import type { PaymentTransactionRepository } from '../../../billing/repositories/payment-transaction.repository';
import type { PaypalAdapter } from '../../../gateways/paypal/paypal.adapter';
import type { SubscriptionLifecycleService } from '../../../billing/services/subscription-lifecycle.service';
import type { SubscriptionRepository } from '../../../subscriptions/repositories/subscription.repository';
import type { PaymentActivationService } from '../payment-activation.service';
import type { PaymentReversalService } from '../payment-reversal.service';
import type { WebhookEventRepository } from '../../repositories/webhook-event.repository';

// Covers the event types beyond CAPTURE.COMPLETED. Before this dispatch existed
// every one of them was recorded IGNORED: a refund took nobody's access away, a
// chargeback left a disputed subscription active, and a failed recurring payment
// never opened a grace period.

const HEADERS = {
  transmissionId: 't-1',
  transmissionTime: '2026-07-26T00:00:00Z',
  transmissionSig: 'sig',
  certUrl: 'https://api.paypal.com/cert',
  authAlgo: 'SHA256withRSA',
};

const RECORDED_CHARGE = {
  id: 'tx-1',
  subscriptionId: 'sub-1',
  userId: 'user-1',
  amountMinor: 1999,
  currency: 'USD',
};

function reversalBody(eventType: string, resource: Record<string, unknown> = {}): string {
  return JSON.stringify({
    id: `WH-${eventType}`,
    event_type: eventType,
    resource: {
      id: 'REFUND-1',
      amount: { value: '19.99', currency_code: 'USD' },
      links: [{ rel: 'up', href: 'https://api.paypal.com/v2/payments/captures/CAP-1' }],
      ...resource,
    },
  });
}

function subscriptionBody(eventType: string): string {
  return JSON.stringify({
    id: `WH-${eventType}`,
    event_type: eventType,
    resource: { id: 'I-PAYPALSUB1' },
  });
}

describe('PaypalWebhookService — event dispatch', () => {
  let paypal: { verifyWebhookSignature: jest.Mock; getOrder: jest.Mock };
  let events: {
    claim: jest.Mock;
    recordInvalidSignature: jest.Mock;
    markProcessing: jest.Mock;
    markProcessed: jest.Mock;
    markFailed: jest.Mock;
    markIgnored: jest.Mock;
  };
  let sessions: { findById: jest.Mock; markFailed: jest.Mock };
  let activation: { activate: jest.Mock };
  let reversals: { refund: jest.Mock; chargeback: jest.Mock };
  let transactions: {
    findByProviderTransactionId: jest.Mock;
    findLatestChargeForSubscription: jest.Mock;
  };
  let subscriptions: { findByGatewayLookupHash: jest.Mock };
  let lifecycle: { revokeEntitlement: jest.Mock; markPastDue: jest.Mock };
  let service: PaypalWebhookService;

  beforeEach(() => {
    paypal = {
      verifyWebhookSignature: jest.fn().mockResolvedValue(true),
      getOrder: jest.fn(),
    };
    events = {
      claim: jest.fn().mockResolvedValue({ id: 'we-1' }),
      recordInvalidSignature: jest.fn(),
      markProcessing: jest.fn(),
      markProcessed: jest.fn(),
      markFailed: jest.fn(),
      markIgnored: jest.fn(),
    };
    sessions = { findById: jest.fn(), markFailed: jest.fn() };
    activation = { activate: jest.fn() };
    reversals = {
      refund: jest.fn().mockResolvedValue(true),
      chargeback: jest.fn().mockResolvedValue(true),
    };
    transactions = {
      findByProviderTransactionId: jest.fn().mockResolvedValue(null),
      findLatestChargeForSubscription: jest.fn().mockResolvedValue(null),
    };
    subscriptions = { findByGatewayLookupHash: jest.fn().mockResolvedValue(null) };
    lifecycle = { revokeEntitlement: jest.fn(), markPastDue: jest.fn() };

    service = new PaypalWebhookService(
      paypal as unknown as PaypalAdapter,
      events as unknown as WebhookEventRepository,
      sessions as unknown as CheckoutSessionRepository,
      activation as unknown as PaymentActivationService,
      reversals as unknown as PaymentReversalService,
      transactions as unknown as PaymentTransactionRepository,
      subscriptions as unknown as SubscriptionRepository,
      lifecycle as unknown as SubscriptionLifecycleService,
    );
  });

  describe('refund', () => {
    it('reverses and revokes when the reversed capture is one we recorded', async () => {
      transactions.findByProviderTransactionId.mockResolvedValue(RECORDED_CHARGE);

      const result = await service.handle(reversalBody('PAYMENT.CAPTURE.REFUNDED'), HEADERS);

      expect(result.outcome).toBe(WebhookOutcome.PROCESSED);
      expect(reversals.refund).toHaveBeenCalledWith(
        expect.objectContaining({
          subscriptionId: 'sub-1',
          userId: 'user-1',
          amountMinor: 1999,
          currency: 'USD',
          gateway: BillingGateway.PAYPAL,
        }),
      );
      expect(reversals.chargeback).not.toHaveBeenCalled();
    });

    it('resolves the subscription from OUR records, not from the webhook body', async () => {
      // The body names a capture; the mapping from capture to subscription is
      // ours to know. Trusting a subscription id in the payload would let a
      // forged-but-somehow-verified webhook revoke a stranger's plan.
      transactions.findByProviderTransactionId.mockResolvedValue(RECORDED_CHARGE);

      await service.handle(
        reversalBody('PAYMENT.CAPTURE.REFUNDED', { subscription_id: 'sub-ATTACKER' }),
        HEADERS,
      );

      expect(reversals.refund).toHaveBeenCalledWith(
        expect.objectContaining({ subscriptionId: 'sub-1' }),
      );
    });

    it('looks the capture up by the id in links[rel=up]', async () => {
      transactions.findByProviderTransactionId.mockResolvedValue(RECORDED_CHARGE);

      await service.handle(reversalBody('PAYMENT.CAPTURE.REFUNDED'), HEADERS);

      expect(transactions.findByProviderTransactionId).toHaveBeenCalledWith(
        BillingGateway.PAYPAL,
        'CAP-1',
      );
    });

    it('fails loudly when no recorded charge matches the reversed capture', async () => {
      // Succeeding silently would leave a reversal with no effect on entitlement,
      // which is the worst of both outcomes.
      transactions.findByProviderTransactionId.mockResolvedValue(null);

      const result = await service.handle(reversalBody('PAYMENT.CAPTURE.REFUNDED'), HEADERS);

      expect(result.outcome).toBe(WebhookOutcome.FAILED);
      expect(events.markFailed).toHaveBeenCalledWith('we-1', 'PAYMENT_REFERENCE_MISMATCH');
      expect(reversals.refund).not.toHaveBeenCalled();
    });

    it('reports a redelivered refund as a duplicate rather than reversing twice', async () => {
      transactions.findByProviderTransactionId.mockResolvedValue(RECORDED_CHARGE);
      reversals.refund.mockResolvedValue(false);

      const result = await service.handle(reversalBody('PAYMENT.CAPTURE.REFUNDED'), HEADERS);

      expect(result.outcome).toBe(WebhookOutcome.DUPLICATE);
    });

    it('falls back to the full original charge when the payload omits the amount', async () => {
      // Under-recording a reversal would leave entitlement standing on money we
      // no longer have.
      transactions.findByProviderTransactionId.mockResolvedValue({
        ...RECORDED_CHARGE,
        amountMinor: 2500,
      });

      await service.handle(
        JSON.stringify({
          id: 'WH-REV-NOAMT',
          event_type: 'PAYMENT.CAPTURE.REFUNDED',
          resource: {
            id: 'REFUND-2',
            links: [{ rel: 'up', href: 'https://api.paypal.com/v2/payments/captures/CAP-1' }],
          },
        }),
        HEADERS,
      );

      expect(reversals.refund).toHaveBeenCalledWith(
        expect.objectContaining({ amountMinor: 2500, currency: 'USD' }),
      );
    });
  });

  describe('chargeback', () => {
    it('treats a network reversal as a chargeback, not a refund', async () => {
      // Different subscription status and a different operator meaning: a refund
      // is a decision we made, a chargeback is a dispute against us.
      transactions.findByProviderTransactionId.mockResolvedValue(RECORDED_CHARGE);

      await service.handle(reversalBody('PAYMENT.CAPTURE.REVERSED'), HEADERS);

      expect(reversals.chargeback).toHaveBeenCalledTimes(1);
      expect(reversals.refund).not.toHaveBeenCalled();
    });
  });

  describe('denied capture', () => {
    it('marks the session failed and revokes nothing', async () => {
      // The payment never succeeded, so there is no entitlement and no charge row.
      const result = await service.handle(
        JSON.stringify({
          id: 'WH-DENY-1',
          event_type: 'PAYMENT.CAPTURE.DENIED',
          resource: { custom_id: 'cs-1' },
        }),
        HEADERS,
      );

      expect(result.outcome).toBe(WebhookOutcome.PROCESSED);
      expect(sessions.markFailed).toHaveBeenCalledWith('cs-1', 'PAYMENT_REQUIRED');
      expect(activation.activate).not.toHaveBeenCalled();
      expect(reversals.refund).not.toHaveBeenCalled();
    });

    it('still terminates when the denial names no session', async () => {
      const result = await service.handle(
        JSON.stringify({
          id: 'WH-DENY-2',
          event_type: 'PAYMENT.CAPTURE.DENIED',
          resource: {},
        }),
        HEADERS,
      );

      expect(result.outcome).toBe(WebhookOutcome.PROCESSED);
      expect(sessions.markFailed).not.toHaveBeenCalled();
    });
  });

  describe('gateway subscription lifecycle', () => {
    it('revokes on a gateway cancellation', async () => {
      subscriptions.findByGatewayLookupHash.mockResolvedValue({ id: 'sub-1', userId: 'user-1' });

      const result = await service.handle(
        subscriptionBody('BILLING.SUBSCRIPTION.CANCELLED'),
        HEADERS,
      );

      expect(result.outcome).toBe(WebhookOutcome.PROCESSED);
      expect(lifecycle.revokeEntitlement).toHaveBeenCalledWith(
        expect.objectContaining({ subscriptionId: 'sub-1', status: 'CANCELLED' }),
      );
    });

    it('suspends on a gateway suspension', async () => {
      subscriptions.findByGatewayLookupHash.mockResolvedValue({ id: 'sub-1', userId: 'user-1' });

      await service.handle(subscriptionBody('BILLING.SUBSCRIPTION.SUSPENDED'), HEADERS);

      expect(lifecycle.revokeEntitlement).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'SUSPENDED' }),
      );
    });

    it('marks past due rather than revoking on a failed recurring payment', async () => {
      // A declined card is usually temporary — an expired card, a bank hold.
      // Locking a paying customer out immediately is hostile and bad for recovery.
      subscriptions.findByGatewayLookupHash.mockResolvedValue({ id: 'sub-1', userId: 'user-1' });

      await service.handle(subscriptionBody('BILLING.SUBSCRIPTION.PAYMENT.FAILED'), HEADERS);

      expect(lifecycle.markPastDue).toHaveBeenCalledWith(
        'sub-1',
        'user-1',
        'WH-BILLING.SUBSCRIPTION.PAYMENT.FAILED',
      );
      expect(lifecycle.revokeEntitlement).not.toHaveBeenCalled();
    });

    it('looks the subscription up by hash, never by the plaintext gateway id', async () => {
      subscriptions.findByGatewayLookupHash.mockResolvedValue({ id: 'sub-1', userId: 'user-1' });

      await service.handle(subscriptionBody('BILLING.SUBSCRIPTION.CANCELLED'), HEADERS);

      const [, lookupHash] = subscriptions.findByGatewayLookupHash.mock.calls[0] as [
        string,
        string,
      ];
      expect(lookupHash).toMatch(/^[a-f0-9]{64}$/u);
      expect(lookupHash).not.toContain('I-PAYPALSUB1');
    });

    it('fails when no local subscription matches the gateway id', async () => {
      subscriptions.findByGatewayLookupHash.mockResolvedValue(null);

      const result = await service.handle(
        subscriptionBody('BILLING.SUBSCRIPTION.CANCELLED'),
        HEADERS,
      );

      expect(result.outcome).toBe(WebhookOutcome.FAILED);
      expect(lifecycle.revokeEntitlement).not.toHaveBeenCalled();
    });
  });

  it('records an unhandled event type as ignored, taking no financial action', async () => {
    const result = await service.handle(
      JSON.stringify({ id: 'WH-X', event_type: 'CHECKOUT.ORDER.APPROVED', resource: {} }),
      HEADERS,
    );

    expect(result.outcome).toBe(WebhookOutcome.IGNORED);
    expect(events.markIgnored).toHaveBeenCalledWith('we-1');
    expect(activation.activate).not.toHaveBeenCalled();
    expect(reversals.refund).not.toHaveBeenCalled();
    expect(reversals.chargeback).not.toHaveBeenCalled();
    expect(lifecycle.revokeEntitlement).not.toHaveBeenCalled();
  });

  it('records a vault event as ignored — no entitlement consequence', async () => {
    const result = await service.handle(
      JSON.stringify({
        id: 'WH-VAULT',
        event_type: 'VAULT.PAYMENT-TOKEN.CREATED',
        resource: { id: 'TOKEN-1' },
      }),
      HEADERS,
    );

    expect(result.outcome).toBe(WebhookOutcome.IGNORED);
  });

  it('never reaches a handler when the signature does not verify', async () => {
    transactions.findByProviderTransactionId.mockResolvedValue(RECORDED_CHARGE);
    paypal.verifyWebhookSignature.mockResolvedValue(false);

    const result = await service.handle(reversalBody('PAYMENT.CAPTURE.REFUNDED'), HEADERS);

    expect(result.outcome).toBe(WebhookOutcome.SIGNATURE_INVALID);
    expect(reversals.refund).not.toHaveBeenCalled();
    expect(events.claim).not.toHaveBeenCalled();
  });
});
