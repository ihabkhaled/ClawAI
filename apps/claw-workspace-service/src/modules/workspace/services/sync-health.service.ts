import { Injectable } from '@nestjs/common';

import { AppConfig } from '../../../app/config/app.config';
import { FreshnessBand } from '../../../common/enums/freshness-band.enum';
import type { WorkspaceProvider } from '../../../common/enums/workspace-provider.enum';
import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import { DASHBOARD_WINDOW_MS } from '../constants/sync-cadence.constants';
import { WorkspaceSyncSchedulerManager } from '../managers/workspace-sync-scheduler.manager';
import type {
  ActiveRunRow,
  ConnectorSyncHealth,
  InternalSyncHealth,
  ProviderSyncSummary,
  RunStatRow,
  SyncHealthConnectorProjection,
  SyncHealthDashboard,
} from '../types/sync-health.types';

@Injectable()
export class SyncHealthService {
  private readonly staleMultiplier: number;
  private readonly schedulerEnabled: boolean;

  constructor(
    private readonly prisma: PrismaService,
    private readonly scheduler: WorkspaceSyncSchedulerManager,
  ) {
    const cfg = AppConfig.get();
    this.staleMultiplier = cfg.WORKSPACE_SYNC_STALE_MULTIPLIER;
    this.schedulerEnabled = cfg.WORKSPACE_SCHEDULER_ENABLED;
  }

  async getDashboard(): Promise<SyncHealthDashboard> {
    const generatedAt = new Date();
    const since = new Date(generatedAt.getTime() - DASHBOARD_WINDOW_MS);

    const connectors = await this.prisma.workspaceConnector.findMany({
      where: { isEnabled: true },
      select: {
        id: true,
        name: true,
        provider: true,
        status: true,
        syncIntervalSeconds: true,
        lastSyncAt: true,
        pausedAt: true,
        pauseReason: true,
        statusReason: true,
      },
    });

    const runStatsRaw: unknown = await this.prisma.workspaceSyncRun.groupBy({
      by: ['connectorId', 'status'],
      where: { startedAt: { gte: since } },
      _count: true,
      _avg: { durationMs: true },
    });
    const runStats = runStatsRaw as RunStatRow[];

    const activeRunsRaw: unknown = await this.prisma.workspaceSyncRun.groupBy({
      by: ['connectorId'],
      where: { status: 'RUNNING' },
      _count: true,
    });
    const activeRuns = activeRunsRaw as ActiveRunRow[];

    const connectorHealth = connectors.map((connector) =>
      this.projectConnector(connector as SyncHealthConnectorProjection, runStats, activeRuns),
    );
    const summaries = this.summarizeProviders(connectorHealth);

    return {
      generatedAt: generatedAt.toISOString(),
      connectors: connectorHealth,
      providerSummaries: summaries,
      scheduler: {
        enabled: this.schedulerEnabled,
        lastTickAt: this.scheduler.getLastTickAt()?.toISOString() ?? null,
        activeRuns: activeRuns.reduce((total, row) => total + row._count, 0),
        dlqBacklog: 0,
      },
    };
  }

  async getInternalHealth(): Promise<InternalSyncHealth> {
    const [degraded, paused, stale, active] = await Promise.all([
      this.prisma.workspaceConnector.count({ where: { status: 'DEGRADED' } }),
      this.prisma.workspaceConnector.count({ where: { status: 'PAUSED' } }),
      this.countStaleConnectors(),
      this.prisma.workspaceSyncRun.count({ where: { status: 'RUNNING' } }),
    ]);

    const lastTick = this.scheduler.getLastTickAt();
    const now = Date.now();
    const schedulerAlive = lastTick !== null && now - lastTick.getTime() < 120_000;

    return {
      schedulerEnabled: this.schedulerEnabled,
      schedulerAlive: schedulerAlive || !this.schedulerEnabled,
      lastTickAt: lastTick?.toISOString() ?? null,
      activeRuns: active,
      dlqBacklog: 0,
      staleConnectors: stale,
      degradedConnectors: degraded,
      pausedConnectors: paused,
    };
  }

  private countStaleConnectors(): Promise<number> {
    return this.prisma.workspaceConnector.count({
      where: {
        isEnabled: true,
        status: 'DEGRADED',
        OR: [{ lastSyncAt: null }, { lastSyncAt: { lt: new Date(Date.now() - 3_600_000) } }],
      },
    });
  }

  private projectConnector(
    connector: SyncHealthConnectorProjection,
    runStats: RunStatRow[],
    activeRuns: ActiveRunRow[],
  ): ConnectorSyncHealth {
    const provider = connector.provider as WorkspaceProvider;
    const cadenceSeconds =
      connector.syncIntervalSeconds ?? this.scheduler.getCadenceForProvider(provider);

    const rowsForConnector = runStats.filter((row) => row.connectorId === connector.id);
    const { successRate24h, averageDurationMs, failedRuns } =
      this.computeRunStats(rowsForConnector);

    const active = activeRuns.find((row) => row.connectorId === connector.id);
    const freshnessBand = this.computeFreshnessBand(
      connector.lastSyncAt,
      cadenceSeconds,
      this.staleMultiplier,
    );
    const nextRunAt =
      connector.lastSyncAt === null
        ? null
        : new Date(connector.lastSyncAt.getTime() + cadenceSeconds * 1000).toISOString();

    return {
      connectorId: connector.id,
      name: connector.name,
      provider,
      status: connector.status as ConnectorSyncHealth['status'],
      cadenceSeconds,
      lastSyncAt: connector.lastSyncAt?.toISOString() ?? null,
      nextRunAt,
      freshnessBand,
      successRate24h,
      averageDurationMs,
      activeRunCount: active?._count ?? 0,
      consecutiveFailures: failedRuns,
      lastErrorCode: null,
      pausedAt: connector.pausedAt?.toISOString() ?? null,
      pauseReason: connector.pauseReason ?? null,
    };
  }

  private computeRunStats(rows: RunStatRow[]): {
    successRate24h: number;
    averageDurationMs: number | null;
    failedRuns: number;
  } {
    const totalRuns = rows.reduce((total, row) => total + row._count, 0);
    const successfulRuns = rows
      .filter((row) => row.status === 'COMPLETED')
      .reduce((total, row) => total + row._count, 0);
    const failedRuns = rows
      .filter((row) => row.status === 'FAILED')
      .reduce((total, row) => total + row._count, 0);
    const successRate = totalRuns === 0 ? 1 : successfulRuns / totalRuns;

    const durations = rows
      .map((row) => row._avg.durationMs)
      .filter((value): value is number => value !== null);
    const averageDurationMs =
      durations.length === 0
        ? null
        : Math.round(durations.reduce((sum, value) => sum + value, 0) / durations.length);

    return {
      successRate24h: Number(successRate.toFixed(4)),
      averageDurationMs,
      failedRuns,
    };
  }

  private summarizeProviders(connectors: ConnectorSyncHealth[]): ProviderSyncSummary[] {
    const grouped = new Map<WorkspaceProvider, ConnectorSyncHealth[]>();
    for (const connector of connectors) {
      const bucket = grouped.get(connector.provider) ?? [];
      bucket.push(connector);
      grouped.set(connector.provider, bucket);
    }
    const summaries: ProviderSyncSummary[] = [];
    for (const [provider, rows] of grouped.entries()) {
      summaries.push(this.summarizeProvider(provider, rows));
    }
    summaries.sort((a, b) => a.provider.localeCompare(b.provider));
    return summaries;
  }

  private summarizeProvider(
    provider: WorkspaceProvider,
    rows: ConnectorSyncHealth[],
  ): ProviderSyncSummary {
    const durations = rows
      .map((row) => row.averageDurationMs)
      .filter((value): value is number => value !== null);
    const avgDuration =
      durations.length === 0
        ? null
        : Math.round(durations.reduce((sum, value) => sum + value, 0) / durations.length);
    const totalSuccess =
      rows.reduce((sum, row) => sum + row.successRate24h, 0) / Math.max(rows.length, 1);
    return {
      provider,
      connectorCount: rows.length,
      degradedCount: rows.filter((row) => row.status === 'DEGRADED').length,
      pausedCount: rows.filter((row) => row.status === 'PAUSED').length,
      averageDurationMs: avgDuration,
      successRate24h: Number(totalSuccess.toFixed(4)),
    };
  }

  private computeFreshnessBand(
    lastSyncAt: Date | null,
    cadenceSeconds: number,
    multiplier: number,
  ): FreshnessBand {
    if (lastSyncAt === null) {
      return FreshnessBand.STALE;
    }
    const ageSeconds = (Date.now() - lastSyncAt.getTime()) / 1000;
    if (ageSeconds <= cadenceSeconds) {
      return FreshnessBand.FRESH;
    }
    if (ageSeconds <= cadenceSeconds * multiplier) {
      return FreshnessBand.SLOW;
    }
    return FreshnessBand.STALE;
  }
}
