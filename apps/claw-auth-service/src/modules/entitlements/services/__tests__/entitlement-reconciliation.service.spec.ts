import { Test } from '@nestjs/testing';
import { EventPattern, SubscriptionStatus } from '@claw/shared-types';

import { PaymentEntitlementClient } from '../../clients/payment-entitlement.client';
import { EntitlementInboxRepository } from '../../repositories/entitlement-inbox.repository';
import { EntitlementApplierService } from '../entitlement-applier.service';
import { EntitlementReconciliationService } from '../entitlement-reconciliation.service';

describe('EntitlementReconciliationService', () => {
  const repository = {
    claim: jest.fn(),
    retryFailed: jest.fn(),
    markProcessed: jest.fn(),
    markFailed: jest.fn(),
  };
  const client = {
    getAuthoritativeEntitlement: jest.fn(),
  };
  const applier = {
    apply: jest.fn(),
  };
  let service: EntitlementReconciliationService;

  beforeEach(async () => {
    jest.clearAllMocks();
    repository.claim.mockResolvedValue(true);
    repository.retryFailed.mockResolvedValue(false);
    repository.markProcessed.mockImplementation(async () => {});
    repository.markFailed.mockImplementation(async () => {});
    applier.apply.mockResolvedValue(true);
    const module = await Test.createTestingModule({
      providers: [
        EntitlementReconciliationService,
        { provide: EntitlementInboxRepository, useValue: repository },
        { provide: PaymentEntitlementClient, useValue: client },
        { provide: EntitlementApplierService, useValue: applier },
      ],
    }).compile();
    service = module.get(EntitlementReconciliationService);
  });

  it('applies the payment service paid entitlement through the canonical applier', async () => {
    client.getAuthoritativeEntitlement.mockResolvedValue(paidEntitlement());

    await expect(service.handle(reconcileRequest())).resolves.toBe('APPLIED');
    expect(applier.apply).toHaveBeenCalledWith({
      pattern: EventPattern.BILLING_SUBSCRIPTION_RENEWED,
      userId: 'user-1',
      planId: 'plan-1',
      subscriptionId: 'subscription-1',
      effectiveAtMs: Date.parse('2026-07-26T12:00:00.000Z'),
      entitlementValidUntilMs: Date.parse('2026-08-26T12:00:00.000Z'),
      sourceEventId: 'event-1',
    });
    expect(repository.markProcessed).toHaveBeenCalledWith('event-1');
  });

  it('revokes to free when payment reports no paid entitlement', async () => {
    client.getAuthoritativeEntitlement.mockResolvedValue({
      userId: 'user-1',
      subscriptionId: 'subscription-1',
      hasPaidEntitlement: false,
      planId: null,
      planSlug: 'free',
      planPriceVersionId: null,
      subscriptionStatus: SubscriptionStatus.EXPIRED,
      effectiveAt: '2026-07-26T12:00:00.000Z',
      entitlementValidUntil: '2026-07-26T12:00:00.000Z',
    });

    await expect(service.handle(reconcileRequest())).resolves.toBe('APPLIED');
    expect(applier.apply).toHaveBeenCalledWith(
      expect.objectContaining({
        pattern: EventPattern.BILLING_SUBSCRIPTION_EXPIRED,
        planId: null,
      }),
    );
  });

  it.each([
    ['invalid schema', {}, 'REJECTED_SCHEMA'],
    [
      'untrusted producer',
      reconcileRequest({ producer: 'claw-chat-service' }),
      'REJECTED_PRODUCER',
    ],
    ['unsupported version', reconcileRequest({ schemaVersion: 2 }), 'REJECTED_VERSION'],
  ])('rejects %s before claiming', async (_label, payload, outcome) => {
    await expect(service.handle(payload)).resolves.toBe(outcome);
    expect(repository.claim).not.toHaveBeenCalled();
  });

  it('does not reapply a processed duplicate', async () => {
    repository.claim.mockResolvedValue(false);
    repository.retryFailed.mockResolvedValue(false);

    await expect(service.handle(reconcileRequest())).resolves.toBe('DUPLICATE');
    expect(client.getAuthoritativeEntitlement).not.toHaveBeenCalled();
  });

  it('reclaims a failed event for a broker retry', async () => {
    repository.claim.mockResolvedValue(false);
    repository.retryFailed.mockResolvedValue(true);
    client.getAuthoritativeEntitlement.mockResolvedValue(paidEntitlement());

    await expect(service.handle(reconcileRequest())).resolves.toBe('APPLIED');
    expect(client.getAuthoritativeEntitlement).toHaveBeenCalledWith('user-1');
  });

  it('records a bounded failure and rethrows so the broker retries', async () => {
    client.getAuthoritativeEntitlement.mockRejectedValue(new Error('payment unavailable'));

    await expect(service.handle(reconcileRequest())).rejects.toThrow('payment unavailable');
    expect(repository.markFailed).toHaveBeenCalledWith('event-1', 'payment unavailable');
  });
});

function reconcileRequest(overrides: Record<string, unknown> = {}) {
  return {
    eventId: 'event-1',
    schemaVersion: 1,
    producer: 'claw-payment-service',
    causationId: null,
    correlationId: 'correlation-1',
    occurredAt: '2026-07-26T11:59:00.000Z',
    userId: 'user-1',
    subscriptionId: 'subscription-1',
    reasonCode: 'ENTITLEMENT_DRIFT',
    ...overrides,
  };
}

function paidEntitlement() {
  return {
    userId: 'user-1',
    subscriptionId: 'subscription-1',
    hasPaidEntitlement: true,
    planId: 'plan-1',
    planSlug: 'pro',
    planPriceVersionId: 'price-1',
    subscriptionStatus: SubscriptionStatus.ACTIVE,
    effectiveAt: '2026-07-26T12:00:00.000Z',
    entitlementValidUntil: '2026-08-26T12:00:00.000Z',
  };
}
