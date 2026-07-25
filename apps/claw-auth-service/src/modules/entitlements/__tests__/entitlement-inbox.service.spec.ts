import { EntitlementInboxService } from '../services/entitlement-inbox.service';
import { type EntitlementInboxRepository } from '../repositories/entitlement-inbox.repository';
import { type EntitlementApplierService } from '../services/entitlement-applier.service';

const validEvent = (overrides: Record<string, unknown> = {}): Record<string, unknown> => ({
  eventId: 'evt-1',
  schemaVersion: 1,
  producer: 'claw-payment-service',
  userId: 'u1',
  subscriptionId: 'sub-1',
  planId: 'plan-pro',
  effectiveAt: '2026-07-26T00:00:00.000Z',
  entitlementValidUntil: '2026-08-26T00:00:00.000Z',
  correlationId: 'corr-1',
  ...overrides,
});

describe('EntitlementInboxService', () => {
  let service: EntitlementInboxService;
  let repository: {
    claim: jest.Mock;
    markProcessed: jest.Mock;
    markFailed: jest.Mock;
    markSkipped: jest.Mock;
  };
  let applier: { apply: jest.Mock };

  beforeEach(() => {
    repository = {
      claim: jest.fn().mockResolvedValue(true),
      markProcessed: jest.fn(),
      markFailed: jest.fn(),
      markSkipped: jest.fn(),
    };
    applier = { apply: jest.fn().mockResolvedValue(true) };
    service = new EntitlementInboxService(
      repository as unknown as EntitlementInboxRepository,
      applier as unknown as EntitlementApplierService,
    );
  });

  it('applies a valid event and marks it processed', async () => {
    const outcome = await service.handle('billing.subscription.activated', validEvent());
    expect(outcome).toBe('APPLIED');
    expect(applier.apply).toHaveBeenCalledTimes(1);
    expect(repository.markProcessed).toHaveBeenCalledWith('evt-1');
  });

  it('ignores a redelivered event without applying it twice', async () => {
    // Delivery is at-least-once, so this is the normal case after any broker
    // retry — not an error.
    repository.claim.mockResolvedValue(false);
    const outcome = await service.handle('billing.subscription.activated', validEvent());
    expect(outcome).toBe('DUPLICATE');
    expect(applier.apply).not.toHaveBeenCalled();
  });

  it('rejects an event from an untrusted producer', async () => {
    // Only the payment service may move a user onto a paid plan. Anything else
    // claiming to is a security event, not a routing mistake.
    const outcome = await service.handle(
      'billing.subscription.activated',
      validEvent({ producer: 'totally-not-the-payment-service' }),
    );
    expect(outcome).toBe('REJECTED_PRODUCER');
    expect(repository.claim).not.toHaveBeenCalled();
    expect(applier.apply).not.toHaveBeenCalled();
  });

  it('rejects an unsupported schema version rather than guessing', async () => {
    const outcome = await service.handle(
      'billing.subscription.activated',
      validEvent({ schemaVersion: 99 }),
    );
    expect(outcome).toBe('REJECTED_VERSION');
    expect(applier.apply).not.toHaveBeenCalled();
  });

  it.each([
    ['missing userId', { userId: undefined }],
    ['missing eventId', { eventId: undefined }],
    ['non-ISO effectiveAt', { effectiveAt: 'yesterday' }],
    ['missing entitlementValidUntil', { entitlementValidUntil: undefined }],
  ])('rejects a malformed envelope (%s)', async (_label, overrides) => {
    const outcome = await service.handle(
      'billing.subscription.activated',
      validEvent(overrides as Record<string, unknown>),
    );
    expect(outcome).toBe('REJECTED_SCHEMA');
    expect(repository.claim).not.toHaveBeenCalled();
  });

  it('rejects a non-object payload', async () => {
    expect(await service.handle('billing.subscription.activated', 'nonsense')).toBe(
      'REJECTED_SCHEMA',
    );
    expect(await service.handle('billing.subscription.activated', null)).toBe('REJECTED_SCHEMA');
  });

  it('reports a stale event as skipped, not applied', async () => {
    // An out-of-order redelivery must not hand back access the user no longer
    // has. The applier decides; the inbox records the decision.
    applier.apply.mockResolvedValue(false);
    const outcome = await service.handle('billing.subscription.activated', validEvent());
    expect(outcome).toBe('SKIPPED_STALE');
    expect(repository.markProcessed).toHaveBeenCalled();
  });

  it('records a failure instead of losing the event', async () => {
    applier.apply.mockRejectedValue(new Error('database unavailable'));
    const outcome = await service.handle('billing.subscription.activated', validEvent());
    expect(outcome).toBe('FAILED');
    expect(repository.markFailed).toHaveBeenCalledWith(
      'evt-1',
      expect.stringContaining('database'),
    );
    expect(repository.markProcessed).not.toHaveBeenCalled();
  });

  it('claims the event before applying it, so a concurrent redelivery loses', async () => {
    const order: string[] = [];
    repository.claim.mockImplementation(async () => {
      order.push('claim');
      return true;
    });
    applier.apply.mockImplementation(async () => {
      order.push('apply');
      return true;
    });
    await service.handle('billing.subscription.activated', validEvent());
    expect(order).toEqual(['claim', 'apply']);
  });

  it('passes the revoking pattern through to the applier', async () => {
    await service.handle('billing.payment.chargeback', validEvent({ eventId: 'evt-2' }));
    expect(applier.apply).toHaveBeenCalledWith(
      expect.objectContaining({ pattern: 'billing.payment.chargeback' }),
    );
  });
});
