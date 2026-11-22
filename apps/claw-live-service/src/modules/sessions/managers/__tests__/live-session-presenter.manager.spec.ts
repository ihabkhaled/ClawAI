import { LiveSessionPresenterManager } from '../live-session-presenter.manager';

describe('LiveSessionPresenterManager', () => {
  it('reports the session counters as integer micro-USD numbers plus the month usage', async () => {
    const billing = { usage: vi.fn().mockResolvedValue({ month: '2026-11' }) };
    const presenter = new LiveSessionPresenterManager(billing as never);
    const view = await presenter.usage({
      userId: 'u1',
      billedSeconds: 120,
      pendingSeconds: 7,
      spentMicroUsd: 40_000n,
      paidApprovedAt: new Date(),
      spendingCapMicroUsd: 100_000n,
    } as never);
    expect(view).toEqual({
      billedSeconds: 120,
      pendingSeconds: 7,
      spentMicroUsd: 40_000,
      paidApproved: true,
      spendingCapMicroUsd: 100_000,
      month: { month: '2026-11' },
    });
  });
});
