import { LiveStatusCode } from '../../../../common/enums/live-status-code.enum';
import { LiveSessionState } from '../../../../generated/prisma';
import { LiveSessionDetachManager } from '../live-session-detach.manager';

function row(overrides: Record<string, unknown> = {}) {
  return {
    id: 'sess1',
    userId: 'u1',
    runId: 'run1',
    state: LiveSessionState.ACTIVE,
    pendingSeconds: 25,
    ...overrides,
  };
}

function setup(fresh = row()) {
  const sessions = {
    findById: vi.fn().mockResolvedValue(fresh),
    markDetached: vi.fn().mockResolvedValue(true),
  };
  const presence = { remove: vi.fn() };
  const billing = { settleBlock: vi.fn() };
  const coordinator = { onViewerDetached: vi.fn().mockResolvedValue(undefined) };
  const publisher = { publish: vi.fn() };
  const manager = new LiveSessionDetachManager(
    sessions as never,
    presence as never,
    billing as never,
    coordinator as never,
    publisher as never,
  );
  return { manager, sessions, presence, billing, coordinator, publisher };
}

describe('LiveSessionDetachManager', () => {
  it('settles the partial block (final), detaches, removes presence and tells the coordinator', async () => {
    const { manager, billing, presence, coordinator, publisher } = setup();
    await expect(manager.detach(row() as never, 'CLOSED')).resolves.toBe(true);
    expect(billing.settleBlock).toHaveBeenCalledWith(expect.objectContaining({ id: 'sess1' }), 25, {
      final: true,
    });
    expect(presence.remove).toHaveBeenCalledWith('run1', 'sess1');
    expect(coordinator.onViewerDetached).toHaveBeenCalledWith('run1');
    expect(publisher.publish).toHaveBeenCalledWith(
      expect.objectContaining({
        status: LiveStatusCode.COMPLETED,
        data: expect.objectContaining({
          sessionId: 'sess1',
          sessionState: LiveSessionState.DETACHED,
        }),
      }),
    );
  });

  it('is a no-op for an already-detached session and for a lost race', async () => {
    const { manager, sessions, coordinator } = setup();
    await expect(
      manager.detach(row({ state: LiveSessionState.DETACHED }) as never, 'CLOSED'),
    ).resolves.toBe(false);
    sessions.markDetached.mockResolvedValue(false);
    await expect(manager.detach(row() as never, 'CLOSED')).resolves.toBe(false);
    expect(coordinator.onViewerDetached).not.toHaveBeenCalled();
  });

  it('does not settle seconds dropped by a credits stop', async () => {
    const { manager, billing } = setup(row({ state: LiveSessionState.CREDITS_REQUIRED }));
    await manager.detach(row({ state: LiveSessionState.CREDITS_REQUIRED }) as never, 'CLOSED');
    expect(billing.settleBlock).not.toHaveBeenCalled();
  });

  it('logs and swallows a coordinator failure', async () => {
    const { manager, coordinator } = setup(row({ pendingSeconds: 0 }));
    coordinator.onViewerDetached.mockRejectedValue(new Error('db'));
    await expect(manager.detach(row() as never, 'NETWORK_LOSS')).resolves.toBe(true);
  });
});
