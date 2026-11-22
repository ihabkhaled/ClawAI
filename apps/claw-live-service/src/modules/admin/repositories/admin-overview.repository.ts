import { Injectable } from '@nestjs/common';

import { LiveRunStatus, LiveSessionState, Prisma } from '../../../generated/prisma';
import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import {
  LIVE_RUN_STATUSES,
  OVERVIEW_ACTIVE_RUNS_LIMIT,
  STOPPABLE_RUN_STATUSES,
} from '../constants/admin.constants';
import type {
  ActiveRunRow,
  MoneyAggregates,
  RawMoney,
  RawStage,
  StageStatsRow,
} from '../types/admin.types';

@Injectable()
export class AdminOverviewRepository {
  constructor(private readonly prisma: PrismaService) {}

  listActiveRuns(): Promise<ActiveRunRow[]> {
    return this.prisma.liveProcessingRun.findMany({
      where: { status: { in: LIVE_RUN_STATUSES } },
      orderBy: { startedAt: 'asc' },
      take: OVERVIEW_ACTIVE_RUNS_LIMIT,
      select: {
        id: true,
        status: true,
        mode: true,
        startedAt: true,
        lastCommitAt: true,
        failureCode: true,
        leaseOwner: true,
        stream: { select: { sourceKind: true, title: true } },
      },
    });
  }

  /** Non-DETACHED sessions per run. */
  async viewersByRun(runIds: string[]): Promise<Map<string, number>> {
    const groups = await this.prisma.liveViewerSession.groupBy({
      by: ['runId'],
      where: { runId: { in: runIds }, state: { not: LiveSessionState.DETACHED } },
      _count: { _all: true },
    });
    return new Map(
      groups.flatMap((group) =>
        group.runId === null ? [] : [[group.runId, group._count._all] as const],
      ),
    );
  }

  countActiveViewers(): Promise<number> {
    return this.prisma.liveViewerSession.count({
      where: { state: { not: LiveSessionState.DETACHED } },
    });
  }

  countFailedSince(since: Date): Promise<number> {
    return this.prisma.liveProcessingRun.count({
      where: { status: LiveRunStatus.FAILED, updatedAt: { gte: since } },
    });
  }

  countDelayed(): Promise<number> {
    return this.prisma.liveProcessingRun.count({ where: { status: LiveRunStatus.DELAYED } });
  }

  countUncertainSince(since: Date): Promise<number> {
    return this.prisma.liveTranscriptSegment.count({
      where: { uncertain: true, processedAt: { gte: since } },
    });
  }

  /** Per-stage call count, failures and latency percentiles over the window. */
  async stageStats(since: Date): Promise<StageStatsRow[]> {
    const rows = await this.prisma.$queryRaw<RawStage[]>(Prisma.sql`
      SELECT stage::text AS stage,
             COUNT(*)::int AS calls,
             COUNT(*) FILTER (WHERE NOT succeeded)::int AS failed,
             percentile_cont(0.5) WITHIN GROUP (ORDER BY latency_ms)::float8 AS p50,
             percentile_cont(0.95) WITHIN GROUP (ORDER BY latency_ms)::float8 AS p95
      FROM live_provider_costs
      WHERE created_at >= ${since}
      GROUP BY stage
    `);
    return rows.map((row) => ({
      stage: row.stage,
      calls: Number(row.calls),
      failed: Number(row.failed),
      p50: row.p50,
      p95: row.p95,
    }));
  }

  /** Cost, revenue, seconds and stream hours over the window, plus provider cost since `today`. */
  async moneyAggregates(since: Date, today: Date): Promise<MoneyAggregates> {
    const [row] = await this.prisma.$queryRaw<RawMoney[]>(Prisma.sql`
      SELECT
        (SELECT COALESCE(SUM(cost_micro_usd), 0)::bigint FROM live_provider_costs
          WHERE created_at >= ${since}) AS provider_cost,
        (SELECT COALESCE(SUM(cost_micro_usd), 0)::bigint FROM live_provider_costs
          WHERE created_at >= ${today}) AS today_cost,
        (SELECT COALESCE(SUM(micro_usd), 0)::bigint FROM live_usage_charges
          WHERE created_at >= ${since} AND kind IN ('PAID', 'VISION', 'ENHANCEMENT')) AS revenue,
        (SELECT COALESCE(SUM(seconds), 0)::bigint FROM live_usage_charges
          WHERE created_at >= ${since} AND kind = 'FREE') AS free_seconds,
        (SELECT COALESCE(SUM(seconds), 0)::bigint FROM live_usage_charges
          WHERE created_at >= ${since} AND kind = 'PAID') AS paid_seconds,
        (SELECT COALESCE(SUM(seconds), 0)::bigint FROM live_usage_charges
          WHERE created_at >= ${since} AND kind = 'GRACE') AS grace_seconds,
        (SELECT COALESCE(SUM(EXTRACT(EPOCH FROM (
            COALESCE(ended_at, now() AT TIME ZONE 'UTC') - GREATEST(started_at, ${since}::timestamp)
          ))), 0) / 3600.0
          FROM live_processing_runs
          WHERE started_at <= (now() AT TIME ZONE 'UTC') AND COALESCE(ended_at, now() AT TIME ZONE 'UTC') >= ${since}::timestamp)::float8
          AS stream_hours
    `);
    return {
      providerCostMicroUsd: Number(row?.provider_cost ?? 0),
      todayCostMicroUsd: Number(row?.today_cost ?? 0),
      revenueMicroUsd: Number(row?.revenue ?? 0),
      freeSeconds: Number(row?.free_seconds ?? 0),
      paidSeconds: Number(row?.paid_seconds ?? 0),
      graceSeconds: Number(row?.grace_seconds ?? 0),
      streamHours: Number(row?.stream_hours ?? 0),
    };
  }

  findRun(runId: string): Promise<{ id: string; status: LiveRunStatus } | null> {
    return this.prisma.liveProcessingRun.findUnique({
      where: { id: runId },
      select: { id: true, status: true },
    });
  }

  /** Emergency stop: STOPPING and out of the active-key slot, only from a still-running status. */
  async stopRun(runId: string): Promise<number> {
    const result = await this.prisma.liveProcessingRun.updateMany({
      where: { id: runId, status: { in: STOPPABLE_RUN_STATUSES } },
      data: { status: LiveRunStatus.STOPPING, activeKey: null },
    });
    return result.count;
  }
}
