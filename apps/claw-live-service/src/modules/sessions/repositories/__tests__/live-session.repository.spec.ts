import { LiveSessionState } from '../../../../generated/prisma';
import { LiveCoverageRepository } from '../live-coverage.repository';
import { LiveSessionRepository } from '../live-session.repository';

function prisma() {
  return {
    liveViewerSession: {
      create: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
    },
    liveProcessingRun: { findUnique: vi.fn() },
    liveSessionCoverage: { findFirst: vi.fn(), update: vi.fn(), create: vi.fn() },
  };
}

describe('LiveSessionRepository', () => {
  it('scopes owned reads by user', async () => {
    const db = prisma();
    await new LiveSessionRepository(db as never).findOwned('s1', 'u1');
    expect(db.liveViewerSession.findFirst).toHaveBeenCalledWith({
      where: { id: 's1', userId: 'u1' },
    });
  });

  it('fences the heartbeat write on the expected state and increments pending atomically', async () => {
    const db = prisma();
    const at = new Date();
    const applied = await new LiveSessionRepository(db as never).recordHeartbeat('s1', {
      expectedState: LiveSessionState.ACTIVE,
      state: LiveSessionState.ACTIVE,
      lastHeartbeatAt: at,
      lastPlaybackAt: 5n,
      pendingIncrement: 10,
    });
    expect(applied).toBe(true);
    expect(db.liveViewerSession.updateMany).toHaveBeenCalledWith({
      where: { id: 's1', state: LiveSessionState.ACTIVE },
      data: {
        state: LiveSessionState.ACTIVE,
        lastHeartbeatAt: at,
        lastPlaybackAt: 5n,
        pendingSeconds: { increment: 10 },
      },
    });
  });

  it('detaches once and finds stale open sessions with a run', async () => {
    const db = prisma();
    const repository = new LiveSessionRepository(db as never);
    await expect(repository.markDetached('s1', new Date())).resolves.toBe(true);
    const before = new Date();
    await repository.findStale(before, 100);
    expect(db.liveViewerSession.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          runId: { not: null },
          OR: [
            { lastHeartbeatAt: { lt: before } },
            { lastHeartbeatAt: null, startedAt: { lt: before } },
          ],
        }),
        take: 100,
      }),
    );
  });

  it('counts only open sessions toward the concurrency limit', async () => {
    const db = prisma();
    await new LiveSessionRepository(db as never).countOpen('u1');
    const where = db.liveViewerSession.count.mock.calls[0]?.[0].where;
    expect(where.state.in).not.toContain(LiveSessionState.DETACHED);
    expect(where.state.in).not.toContain(LiveSessionState.UNSUPPORTED);
  });
});

describe('LiveCoverageRepository', () => {
  it('reads the latest interval of the session on the run and writes intervals', async () => {
    const db = prisma();
    const repository = new LiveCoverageRepository(db as never);
    await repository.latest('s1', 'r1');
    expect(db.liveSessionCoverage.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { sessionId: 's1', runId: 'r1' } }),
    );
    await repository.open('s1', 'r1', 9n);
    expect(db.liveSessionCoverage.create).toHaveBeenCalledWith({
      data: { sessionId: 's1', runId: 'r1', fromAt: 9n, toAt: 9n },
    });
    await repository.extend('c1', 12n);
    await repository.markGap('c1');
    expect(db.liveSessionCoverage.update).toHaveBeenLastCalledWith({
      where: { id: 'c1' },
      data: { endsInGap: true },
    });
  });
});
