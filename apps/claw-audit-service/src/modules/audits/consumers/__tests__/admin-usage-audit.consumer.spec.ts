import {
  ADMIN_USAGE_AUDIT_ACTIONS,
  ADMIN_USAGE_EXPORTED_EVENT,
  ADMIN_USAGE_LISTED_EVENT,
  ADMIN_USAGE_VIEWED_EVENT,
} from '../../constants/observability.constants';
import { AdminUsageAuditConsumer } from '../admin-usage-audit.consumer';

function build() {
  const handlers = new Map<string, (raw: unknown) => Promise<void>>();
  const rabbit = {
    subscribe: vi.fn().mockImplementation(async (pattern: string, handler) => {
      handlers.set(pattern, handler);
    }),
  };
  const audits = { createAuditLog: vi.fn().mockResolvedValue(undefined) };
  const consumer = new AdminUsageAuditConsumer(rabbit as never, audits as never);
  return { consumer, handlers, audits };
}

describe('AdminUsageAuditConsumer', () => {
  it('subscribes to viewed, exported and listed events', async () => {
    const { consumer, handlers } = build();
    await consumer.onModuleInit();
    expect([...handlers.keys()].sort()).toEqual(
      [ADMIN_USAGE_VIEWED_EVENT, ADMIN_USAGE_EXPORTED_EVENT, ADMIN_USAGE_LISTED_EVENT].sort(),
    );
  });

  it('writes a LISTED audit row with the actor and filters, and no email', async () => {
    const { consumer, handlers, audits } = build();
    await consumer.onModuleInit();
    await handlers.get(ADMIN_USAGE_LISTED_EVENT)?.({
      actorUserId: 'admin-1',
      targetUserId: null,
      filters: { hasSearch: true },
      at: '2026-10-11T10:00:00Z',
    });
    expect(audits.createAuditLog).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({
        userId: 'admin-1',
        action: ADMIN_USAGE_AUDIT_ACTIONS.LISTED,
        details: { filters: { hasSearch: true }, at: '2026-10-11T10:00:00Z' },
      }),
    );
  });

  it('ignores a payload without an actor and survives a failed write', async () => {
    const { consumer, audits } = build();
    await consumer.handle(ADMIN_USAGE_AUDIT_ACTIONS.LISTED, { filters: {} });
    expect(audits.createAuditLog).not.toHaveBeenCalled();
    audits.createAuditLog.mockRejectedValue(new Error('db down'));
    await expect(
      consumer.handle(ADMIN_USAGE_AUDIT_ACTIONS.LISTED, { actorUserId: 'a', filters: {} }),
    ).resolves.toBeUndefined();
  });
});
