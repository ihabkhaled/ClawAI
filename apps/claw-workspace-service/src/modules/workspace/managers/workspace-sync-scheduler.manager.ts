import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { RabbitMQService } from '@claw/shared-rabbitmq';
import type { WorkspaceSyncTriggeredBy } from '@claw/shared-types';

import { AppConfig } from '../../../app/config/app.config';
import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import { tryAcquireAdvisoryLock } from '../../../common/utilities/advisory-lock.utility';
import {
  FALLBACK_CADENCE_SECONDS,
  SCHEDULER_LOCK_NAMESPACE,
  SCHEDULER_TICK_CRON,
  SYNC_TICK_ROUTING_KEY_PREFIX,
} from '../constants/sync-cadence.constants';
import { WorkspaceConnectorRepository } from '../repositories/workspace-connector.repository';
import { SyncCadenceRepository } from '../repositories/sync-cadence.repository';
import type { ConnectorSyncEligibility, SchedulerTickPayload } from '../types/sync-cadence.types';
import { WorkspaceProvider } from '../../../common/enums/workspace-provider.enum';

@Injectable()
export class WorkspaceSyncSchedulerManager implements OnModuleInit {
  private readonly logger = new Logger(WorkspaceSyncSchedulerManager.name);

  private readonly enabled: boolean;
  private readonly fallbackIntervalSeconds: number;
  private cadenceCache = new Map<WorkspaceProvider, number>();
  private lastTickAt: Date | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly connectorRepository: WorkspaceConnectorRepository,
    private readonly cadenceRepository: SyncCadenceRepository,
    private readonly rabbitmq: RabbitMQService,
  ) {
    const cfg = AppConfig.get();
    this.enabled = cfg.WORKSPACE_SCHEDULER_ENABLED;
    this.fallbackIntervalSeconds = cfg.WORKSPACE_SYNC_DEFAULT_INTERVAL_SECONDS;
  }

  async onModuleInit(): Promise<void> {
    if (!this.enabled) {
      this.logger.warn('Workspace sync scheduler is DISABLED (WORKSPACE_SCHEDULER_ENABLED=false)');
      return;
    }
    await this.reloadCadenceCache();
  }

  @Cron(SCHEDULER_TICK_CRON, { name: 'workspace.sync.tick' })
  async tick(): Promise<void> {
    if (!this.enabled) {
      return;
    }

    const acquired = await tryAcquireAdvisoryLock(this.prisma, SCHEDULER_LOCK_NAMESPACE);
    if (!acquired) {
      this.logger.debug('Scheduler tick skipped — another replica holds the lock');
      return;
    }

    try {
      await this.fanOutEligibleConnectors();
      this.lastTickAt = new Date();
    } catch (error) {
      this.logger.error('Scheduler tick failed', this.formatError(error));
    }
  }

  getLastTickAt(): Date | null {
    return this.lastTickAt;
  }

  getCadenceForProvider(provider: WorkspaceProvider): number {
    return (
      this.cadenceCache.get(provider) ??
      FALLBACK_CADENCE_SECONDS[provider] ??
      this.fallbackIntervalSeconds
    );
  }

  async reloadCadenceCache(): Promise<void> {
    const rows = await this.cadenceRepository.findAll();
    const next = new Map<WorkspaceProvider, number>();
    for (const row of rows) {
      next.set(row.provider, row.intervalSeconds);
    }
    this.cadenceCache = next;
  }

  computeEligibility(
    candidate: {
      id: string;
      userId: string;
      provider: WorkspaceProvider;
      syncIntervalSeconds: number | null;
      lastSyncAt: Date | null;
      lastTickAt: Date | null;
    },
    now: Date = new Date(),
  ): ConnectorSyncEligibility {
    const cadenceSeconds =
      candidate.syncIntervalSeconds ?? this.getCadenceForProvider(candidate.provider);
    const anchor = candidate.lastSyncAt ?? candidate.lastTickAt;
    const nextRunAt = anchor === null ? now : new Date(anchor.getTime() + cadenceSeconds * 1000);
    return {
      connectorId: candidate.id,
      provider: candidate.provider,
      userId: candidate.userId,
      cadenceSeconds,
      lastSyncAt: candidate.lastSyncAt,
      lastTickAt: candidate.lastTickAt,
      nextRunAt,
      isEligible: nextRunAt.getTime() <= now.getTime(),
    };
  }

  private async fanOutEligibleConnectors(): Promise<void> {
    const candidates = await this.connectorRepository.findScheduleCandidates();
    const now = new Date();
    const eligible = candidates
      .map((candidate) =>
        this.computeEligibility(
          {
            id: candidate.id,
            userId: candidate.userId,
            provider: candidate.provider as unknown as WorkspaceProvider,
            syncIntervalSeconds: candidate.syncIntervalSeconds,
            lastSyncAt: candidate.lastSyncAt,
            lastTickAt: candidate.lastTickAt,
          },
          now,
        ),
      )
      .filter((entry) => entry.isEligible);

    for (const entry of eligible) {
      await this.publishTick(entry, 'cron', now);
    }

    if (eligible.length > 0) {
      this.logger.log(`Scheduler tick published ${eligible.length} jobs`);
    }
  }

  private async publishTick(
    entry: ConnectorSyncEligibility,
    triggeredBy: WorkspaceSyncTriggeredBy,
    scheduledAt: Date,
  ): Promise<void> {
    const routingKey = `${SYNC_TICK_ROUTING_KEY_PREFIX}.${entry.provider.toLowerCase()}`;
    const payload: SchedulerTickPayload = {
      connectorId: entry.connectorId,
      provider: entry.provider,
      userId: entry.userId,
      scheduledAt: scheduledAt.toISOString(),
      triggeredBy,
      runKey: `${entry.connectorId}:${scheduledAt.getTime()}`,
    };
    await this.rabbitmq.publish(routingKey, payload);
    await this.connectorRepository.markTick(entry.connectorId, scheduledAt);
  }

  private formatError(error: unknown): Record<string, unknown> {
    if (error instanceof Error) {
      return { message: error.message, name: error.name, stack: error.stack };
    }
    return { error: String(error) };
  }
}
