import { NotFoundException } from '@nestjs/common';

import { LiveMode, LiveRunStatus } from '../../../../generated/prisma';
import {
  buildAiStats,
  buildMoney,
  startOfUtcDay,
  toActiveRunView,
} from '../../utilities/admin-overview.utility';
import { AdminOverviewService } from '../admin-overview.service';

const NOW = Date.UTC(2026, 10, 22, 12, 0, 0);

function build() {
  const repository = {
    listActiveRuns: vi.fn().mockResolvedValue([
      {
        id: 'r1',
        status: LiveRunStatus.ACTIVE,
        mode: LiveMode.AUDIO,
        startedAt: new Date(NOW - 3_600_000),
        lastCommitAt: new Date(NOW - 7000),
        failureCode: null,
        leaseOwner: 'w1',
        stream: { sourceKind: 'HLS', title: 'Show' },
      },
    ]),
    viewersByRun: vi.fn().mockResolvedValue(new Map([['r1', 3]])),
    countActiveViewers: vi.fn().mockResolvedValue(3),
    countFailedSince: vi.fn().mockResolvedValue(1),
    countDelayed: vi.fn().mockResolvedValue(0),
    countUncertainSince: vi.fn().mockResolvedValue(4),
    stageStats: vi.fn().mockResolvedValue([
      { stage: 'STT', calls: 80, failed: 4, p50: 900, p95: 2100 },
      { stage: 'SUMMARY', calls: 10, failed: 1, p50: 1500, p95: 4000 },
      { stage: 'TRANSLATION', calls: 10, failed: 0, p50: 400, p95: 800 },
      { stage: 'VISION', calls: 5, failed: 0, p50: 1, p95: 2 },
    ]),
    moneyAggregates: vi.fn().mockResolvedValue({
      providerCostMicroUsd: 3_000_000,
      todayCostMicroUsd: 500_000,
      revenueMicroUsd: 4_000_000,
      freeSeconds: 1800,
      paidSeconds: 1800,
      graceSeconds: 0,
      streamHours: 2,
    }),
    findRun: vi.fn(),
    stopRun: vi.fn().mockResolvedValue(1),
  };
  const policy = {
    active: vi.fn().mockResolvedValue({ version: 1, config: { dailyBudgetMicroUsd: 10_000_000 } }),
  };
  return { repository, service: new AdminOverviewService(repository as never, policy as never) };
}

describe('AdminOverviewService.overview', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
  });
  afterEach(() => vi.useRealTimers());

  it('aggregates runs, viewers, latency and money', async () => {
    const { service, repository } = build();
    const view = await service.overview(7);
    expect(repository.stageStats).toHaveBeenCalledWith(new Date(NOW - 7 * 86_400_000));
    expect(repository.moneyAggregates).toHaveBeenCalledWith(
      new Date(NOW - 7 * 86_400_000),
      new Date(Date.UTC(2026, 10, 22)),
    );
    expect(view.windowDays).toBe(7);
    expect(view.totals).toEqual({ activeRuns: 1, activeViewers: 3, runsFailed: 1, delayedRuns: 0 });
    expect(view.activeRuns[0]).toMatchObject({
      runId: 'r1',
      viewers: 3,
      lagSeconds: 7,
      leaseOwner: 'w1',
      title: 'Show',
    });
    expect(view.ai).toEqual({
      sttP50Ms: 900,
      sttP95Ms: 2100,
      summaryP50Ms: 1500,
      summaryP95Ms: 4000,
      translationP95Ms: 800,
      visionCalls: 5,
      retryOrFailureRate: 5 / 105,
      uncertainSegments: 4,
    });
    expect(view.money).toEqual({
      providerCostMicroUsd: 3_000_000,
      revenueMicroUsd: 4_000_000,
      grossMarginMicroUsd: 1_000_000,
      costPerStreamHourMicroUsd: 1_500_000,
      costPerViewerHourMicroUsd: 3_000_000,
      freeSecondsConsumed: 1800,
      paidSeconds: 1800,
      projectedMonthlyCostMicroUsd: 12_857_143,
      budgetUsedPercentToday: 5,
    });
  });
});

describe('overview utilities', () => {
  it('handles an empty window without dividing by zero', () => {
    expect(buildAiStats([], 0)).toMatchObject({
      sttP95Ms: null,
      visionCalls: 0,
      retryOrFailureRate: 0,
    });
    expect(
      buildMoney(
        {
          providerCostMicroUsd: 5,
          todayCostMicroUsd: 5,
          revenueMicroUsd: 0,
          freeSeconds: 0,
          paidSeconds: 0,
          graceSeconds: 0,
          streamHours: 0,
        },
        1,
        0,
      ),
    ).toMatchObject({
      costPerStreamHourMicroUsd: 0,
      costPerViewerHourMicroUsd: 0,
      budgetUsedPercentToday: 0,
      grossMarginMicroUsd: -5,
    });
  });

  it('reports no lag for a run that has not committed yet', () => {
    const view = toActiveRunView(
      {
        id: 'r',
        status: LiveRunStatus.PENDING,
        mode: LiveMode.AUDIO,
        startedAt: new Date(NOW),
        lastCommitAt: null,
        failureCode: 'X',
        leaseOwner: null,
        stream: { sourceKind: 'FIXTURE', title: null },
      },
      0,
      NOW,
    );
    expect(view).toMatchObject({ lagSeconds: null, lastCommitAt: null, failureCode: 'X' });
    expect(startOfUtcDay(NOW).toISOString()).toBe('2026-11-22T00:00:00.000Z');
  });
});

describe('AdminOverviewService.stopRun', () => {
  it('moves a running run to STOPPING', async () => {
    const { service, repository } = build();
    repository.findRun.mockResolvedValue({ id: 'r1', status: LiveRunStatus.ACTIVE });
    await expect(service.stopRun('r1')).resolves.toEqual({
      runId: 'r1',
      status: LiveRunStatus.STOPPING,
    });
    expect(repository.stopRun).toHaveBeenCalledWith('r1');
  });

  it('is a no-op for a run that already ended and 404s for an unknown run', async () => {
    const { service, repository } = build();
    repository.findRun.mockResolvedValue({ id: 'r1', status: LiveRunStatus.STOPPING });
    await expect(service.stopRun('r1')).resolves.toEqual({
      runId: 'r1',
      status: LiveRunStatus.STOPPING,
    });
    repository.findRun.mockResolvedValue({ id: 'r2', status: LiveRunStatus.ENDED });
    await expect(service.stopRun('r2')).resolves.toEqual({
      runId: 'r2',
      status: LiveRunStatus.ENDED,
    });
    expect(repository.stopRun).not.toHaveBeenCalled();
    repository.findRun.mockResolvedValue(null);
    await expect(service.stopRun('x')).rejects.toBeInstanceOf(NotFoundException);
  });
});
