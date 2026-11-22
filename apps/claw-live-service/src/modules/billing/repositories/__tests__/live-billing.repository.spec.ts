import { LiveSessionState } from '../../../../generated/prisma';
import { LiveBillingRepository } from '../live-billing.repository';

function setup() {
  const tx = {
    liveUsageMonth: { updateMany: vi.fn().mockResolvedValue({ count: 1 }), upsert: vi.fn() },
    liveViewerSession: { updateMany: vi.fn().mockResolvedValue({ count: 1 }) },
    liveUsageCharge: { create: vi.fn() },
  };
  const prisma = {
    $transaction: vi.fn(async (work: (t: unknown) => Promise<unknown>) => work(tx)),
    liveUsageCharge: { findUnique: vi.fn() },
    liveUsageMonth: { upsert: vi.fn(), findUnique: vi.fn() },
    liveViewerSession: { updateMany: vi.fn().mockResolvedValue({ count: 0 }) },
    liveBillingState: {
      upsert: vi.fn(),
      findUnique: vi.fn(),
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
    },
  };
  return { repository: new LiveBillingRepository(prisma as never), prisma, tx };
}

describe('LiveBillingRepository', () => {
  it('takes free seconds only while used + take stays within the limit', async () => {
    const { repository, tx } = setup();
    await expect(repository.takeFreeSeconds(tx as never, 'u', '2026-11', 60, 1800)).resolves.toBe(
      true,
    );
    expect(tx.liveUsageMonth.updateMany).toHaveBeenCalledWith({
      where: { userId: 'u', month: '2026-11', freeSecondsUsed: { lte: 1740 } },
      data: { freeSecondsUsed: { increment: 60 } },
    });
  });

  it('advances the session fenced on the block index', async () => {
    const { repository, tx } = setup();
    await repository.advanceSession(tx as never, {
      sessionId: 's',
      expectedBlockIndex: 3,
      seconds: 60,
      state: LiveSessionState.ACTIVE,
      spentMicroUsd: 20n,
    });
    expect(tx.liveViewerSession.updateMany).toHaveBeenCalledWith({
      where: { id: 's', nextBlockIndex: 3 },
      data: {
        pendingSeconds: { decrement: 60 },
        billedSeconds: { increment: 60 },
        nextBlockIndex: { increment: 1 },
        state: LiveSessionState.ACTIVE,
        spentMicroUsd: { increment: 20n },
      },
    });
  });

  it('opens grace only when none is consumed', async () => {
    const { repository, prisma } = setup();
    const now = new Date();
    await expect(repository.startGrace('u', now)).resolves.toBe(true);
    expect(prisma.liveBillingState.updateMany).toHaveBeenCalledWith({
      where: { userId: 'u', graceConsumed: false },
      data: { graceConsumed: true, graceStartedAt: now },
    });
    await repository.resetGrace('u');
    expect(prisma.liveBillingState.updateMany).toHaveBeenLastCalledWith({
      where: { userId: 'u', graceConsumed: true },
      data: { graceConsumed: false, graceStartedAt: null },
    });
  });

  it('stops a session (never a detached one) and drops its pending seconds', async () => {
    const { repository, prisma } = setup();
    await repository.stopSession('s', LiveSessionState.EXHAUSTED);
    expect(prisma.liveViewerSession.updateMany).toHaveBeenCalledWith({
      where: { id: 's', state: { not: LiveSessionState.DETACHED } },
      data: { pendingSeconds: 0, state: LiveSessionState.EXHAUSTED },
    });
    await expect(
      repository.setSessionState('s', LiveSessionState.GRACE, LiveSessionState.EXHAUSTED),
    ).resolves.toBe(false);
  });

  it('runs work in a transaction and writes charges through the tx client', async () => {
    const { repository, tx } = setup();
    await repository.transaction(async (client) => {
      await repository.createCharge(client, { idempotencyKey: 'k' } as never);
      await repository.addPaidSeconds(client, 'u', '2026-11', 60);
    });
    expect(tx.liveUsageCharge.create).toHaveBeenCalledWith({ data: { idempotencyKey: 'k' } });
    expect(tx.liveUsageMonth.upsert).toHaveBeenCalled();
  });
});
