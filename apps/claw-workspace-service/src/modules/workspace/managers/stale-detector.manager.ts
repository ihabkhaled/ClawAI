import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { RabbitMQService } from '@claw/shared-rabbitmq';
import { EventPattern, type WorkspaceSyncStaleDetectedPayload } from '@claw/shared-types';

import { AppConfig } from '../../../app/config/app.config';
import type { WorkspaceProvider } from '../../../common/enums/workspace-provider.enum';
import { STALE_DETECTOR_CRON } from '../constants/sync-cadence.constants';
import { WorkspaceConnectorRepository } from '../repositories/workspace-connector.repository';
import { WorkspaceSyncSchedulerManager } from './workspace-sync-scheduler.manager';

@Injectable()
export class StaleDetectorManager {
  private readonly logger = new Logger(StaleDetectorManager.name);

  private readonly enabled: boolean;
  private readonly staleMultiplier: number;

  constructor(
    private readonly connectorRepository: WorkspaceConnectorRepository,
    private readonly scheduler: WorkspaceSyncSchedulerManager,
    private readonly rabbitmq: RabbitMQService,
  ) {
    const cfg = AppConfig.get();
    this.enabled = cfg.WORKSPACE_SCHEDULER_ENABLED;
    this.staleMultiplier = cfg.WORKSPACE_SYNC_STALE_MULTIPLIER;
  }

  @Cron(STALE_DETECTOR_CRON, { name: 'workspace.sync.stale_detector' })
  async detect(): Promise<void> {
    if (!this.enabled) {
      return;
    }
    try {
      await this.flipStaleConnectors();
    } catch (error) {
      this.logger.error('Stale detector sweep failed', this.formatError(error));
    }
  }

  async flipStaleConnectors(now: Date = new Date()): Promise<number> {
    const candidates = await this.connectorRepository.findStaleCandidates(now);
    let flipped = 0;

    for (const candidate of candidates) {
      const provider = candidate.provider as WorkspaceProvider;
      const cadenceSeconds = this.scheduler.getCadenceForProvider(provider);
      const connectorCadence = candidate.syncIntervalSeconds ?? cadenceSeconds;
      const thresholdSeconds = connectorCadence * this.staleMultiplier;
      const referenceTime = candidate.lastSyncAt ?? new Date(0);
      const overdueSeconds = Math.floor((now.getTime() - referenceTime.getTime()) / 1000);

      if (overdueSeconds <= thresholdSeconds) {
        continue;
      }

      if (candidate.status === 'DEGRADED') {
        continue;
      }

      await this.connectorRepository.markDegraded(
        candidate.id,
        `Stale — last sync ${overdueSeconds}s ago exceeds ${thresholdSeconds}s threshold`,
      );

      const payload: WorkspaceSyncStaleDetectedPayload = {
        connectorId: candidate.id,
        provider,
        userId: candidate.userId,
        lastSyncAt: candidate.lastSyncAt?.toISOString() ?? null,
        cadenceSeconds: connectorCadence,
        overdueSeconds,
        staleMultiplier: this.staleMultiplier,
        timestamp: now.toISOString(),
      };

      await this.rabbitmq.publish(EventPattern.WORKSPACE_SYNC_STALE_DETECTED, payload);
      flipped += 1;
    }

    if (flipped > 0) {
      this.logger.warn(`StaleDetector flipped ${flipped} connectors to DEGRADED`);
    }
    return flipped;
  }

  private formatError(error: unknown): Record<string, unknown> {
    if (error instanceof Error) {
      return { message: error.message, name: error.name };
    }
    return { error: String(error) };
  }
}
