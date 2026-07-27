import { EntitlementGrantType, EventPattern } from '@claw/shared-types';

import type { RabbitMQService } from '@claw/shared-rabbitmq';
import type { AuditsService } from '../../services/audits.service';
import { BillingAuditConsumer } from '../billing.consumer';

function event(): Record<string, unknown> {
  return {
    eventId: 'event-1',
    schemaVersion: 1,
    producer: 'claw-payment-service',
    causationId: 'subscription-1',
    correlationId: 'run-1',
    occurredAt: '2026-08-01T00:00:00.000Z',
    userId: 'user-1',
    subscriptionId: 'subscription-1',
    planId: 'plan-starter',
    planSlug: 'starter',
    planPriceVersionId: 'price-starter',
    grantType: EntitlementGrantType.PAID_SUBSCRIPTION,
    effectiveAt: '2026-08-01T00:00:00.000Z',
    entitlementValidUntil: '2026-08-04T00:00:00.000Z',
    previousPlanId: 'plan-pro',
    previousPlanSlug: 'pro',
    previousPlanPriceVersionId: 'price-pro',
  };
}

describe('BillingAuditConsumer', () => {
  let rabbit: { subscribe: jest.Mock };
  let audits: { createAuditLog: jest.Mock };
  let consumer: BillingAuditConsumer;

  beforeEach(() => {
    rabbit = { subscribe: jest.fn() };
    audits = { createAuditLog: jest.fn() };
    consumer = new BillingAuditConsumer(
      rabbit as unknown as RabbitMQService,
      audits as unknown as AuditsService,
    );
  });

  it('subscribes the new billing event to the common audit consumer', async () => {
    await consumer.onModuleInit();

    expect(rabbit.subscribe).toHaveBeenCalledWith(
      EventPattern.BILLING_SUBSCRIPTION_DOWNGRADED,
      expect.any(Function),
    );
    expect(rabbit.subscribe).toHaveBeenCalledWith(
      EventPattern.BILLING_SUBSCRIPTION_ACTIVATED,
      expect.any(Function),
    );
  });

  it('writes a privacy-minimal downgrade audit row', async () => {
    await consumer.handleDowngraded({ ...event(), unexpectedGatewayBody: { payer: 'private' } });

    expect(audits.createAuditLog).toHaveBeenCalledWith({
      userId: 'user-1',
      action: 'BILLING_SUBSCRIPTION_DOWNGRADED',
      entityType: 'subscription',
      entityId: 'subscription-1',
      severity: 'MEDIUM',
      details: expect.not.objectContaining({ unexpectedGatewayBody: expect.anything() }),
    });
  });

  it('records refund amount and scope without retaining provider payloads', async () => {
    await consumer.handleRefunded({
      ...event(),
      paymentTransactionId: 'charge-1',
      refundedAmountMinor: 2_500,
      currency: 'USD',
      isFullRefund: false,
      providerResponse: { payerEmail: 'private@example.com' },
    });

    expect(audits.createAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'BILLING_PAYMENT_REFUNDED',
        details: expect.objectContaining({
          paymentTransactionId: 'charge-1',
          refundedAmountMinor: 2_500,
          currency: 'USD',
          isFullRefund: false,
        }),
      }),
    );
    expect(JSON.stringify(audits.createAuditLog.mock.calls)).not.toContain('private@example.com');
  });

  it('throws an invalid payload so RabbitMQ retry and DLQ remain active', async () => {
    await expect(consumer.handleDowngraded({ userId: 'user-1' })).rejects.toThrow(
      'invalid billing audit event',
    );
    expect(audits.createAuditLog).not.toHaveBeenCalled();
  });
});
