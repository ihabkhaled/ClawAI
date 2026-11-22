import { LiveRunStatus } from '../../../../generated/prisma';
import { AdminOverviewRepository } from '../admin-overview.repository';

describe('AdminOverviewRepository', () => {
  it('maps the per-stage aggregate and the money aggregate to plain numbers', async () => {
    const prisma = {
      $queryRaw: vi
        .fn()
        .mockResolvedValueOnce([{ stage: 'STT', calls: 4n, failed: 1n, p50: 10, p95: 20 }])
        .mockResolvedValueOnce([
          {
            provider_cost: 100n,
            today_cost: 40n,
            revenue: 250n,
            free_seconds: 60n,
            paid_seconds: 120n,
            grace_seconds: 5n,
            stream_hours: 1.5,
          },
        ])
        .mockResolvedValueOnce([]),
    };
    const repository = new AdminOverviewRepository(prisma as never);
    const since = new Date('2026-11-21T00:00:00Z');
    await expect(repository.stageStats(since)).resolves.toEqual([
      { stage: 'STT', calls: 4, failed: 1, p50: 10, p95: 20 },
    ]);
    await expect(repository.moneyAggregates(since, since)).resolves.toEqual({
      providerCostMicroUsd: 100,
      todayCostMicroUsd: 40,
      revenueMicroUsd: 250,
      freeSeconds: 60,
      paidSeconds: 120,
      graceSeconds: 5,
      streamHours: 1.5,
    });
    await expect(repository.moneyAggregates(since, since)).resolves.toMatchObject({
      revenueMicroUsd: 0,
    });
  });

  it('counts viewers per run, ignoring sessions with no run', async () => {
    const prisma = {
      liveViewerSession: {
        groupBy: vi.fn().mockResolvedValue([
          { runId: 'r1', _count: { _all: 2 } },
          { runId: null, _count: { _all: 9 } },
        ]),
      },
    };
    const viewers = await new AdminOverviewRepository(prisma as never).viewersByRun(['r1']);
    expect([...viewers]).toEqual([['r1', 2]]);
  });

  it('stops only runs that are still running and clears the active key', async () => {
    const prisma = { liveProcessingRun: { updateMany: vi.fn().mockResolvedValue({ count: 1 }) } };
    const repository = new AdminOverviewRepository(prisma as never);
    await expect(repository.stopRun('r1')).resolves.toBe(1);
    expect(prisma.liveProcessingRun.updateMany).toHaveBeenCalledWith({
      where: { id: 'r1', status: { in: ['PENDING', 'ACTIVE', 'DELAYED'] } },
      data: { status: LiveRunStatus.STOPPING, activeKey: null },
    });
  });
});
