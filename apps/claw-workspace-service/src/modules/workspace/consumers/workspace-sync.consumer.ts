import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { RabbitMQService } from '@claw/shared-rabbitmq';

import { WorkspaceConnectorRepository } from '../repositories/workspace-connector.repository';
import { WorkspaceSyncManager } from '../managers/workspace-sync.manager';
import {
  ORPHAN_RUN_MAX_AGE_MS,
  SYNC_TICK_ROUTING_KEY_PREFIX,
} from '../constants/sync-cadence.constants';
import type { SchedulerTickPayload } from '../types/sync-cadence.types';
import type { WorkspaceConnector } from '../../../generated/prisma';

/**
 * Consumes `workspace.sync.tick.*` events emitted by
 * `WorkspaceSyncSchedulerManager` and invokes the real sync pipeline.
 *
 * Uses `#` wildcard to subscribe once per provider family; the concrete
 * connector id arrives in the payload. Retry + DLQ are handled by
 * `RabbitMQService` at the transport layer; terminal failures emit
 * `workspace.sync.run_failed` via `WorkspaceSyncManager`.
 */
@Injectable()
export class WorkspaceSyncConsumer implements OnModuleInit {
  private readonly logger = new Logger(WorkspaceSyncConsumer.name);

  constructor(
    private readonly rabbitmq: RabbitMQService,
    private readonly connectorRepository: WorkspaceConnectorRepository,
    private readonly syncManager: WorkspaceSyncManager,
  ) {}

  async onModuleInit(): Promise<void> {
    const pattern = `${SYNC_TICK_ROUTING_KEY_PREFIX}.*`;
    await this.rabbitmq.subscribe(pattern, async (raw: unknown) => {
      await this.handleTick(raw);
    });
    this.logger.log(`Subscribed to ${pattern} for scheduled sync ticks`);
  }

  async handleTick(raw: unknown): Promise<void> {
    const payload = this.parsePayload(raw);
    if (payload === null) {
      this.logger.warn('Received malformed scheduler tick payload; dropping');
      return;
    }

    const connector = await this.connectorRepository.findById(payload.connectorId);
    if (connector === null) {
      this.logger.warn(`Tick for unknown connector ${payload.connectorId}; dropping`);
      return;
    }

    if (this.isSkippable(connector)) {
      this.logger.debug(
        `Tick for ${connector.id} skipped (status=${connector.status}, enabled=${connector.isEnabled})`,
      );
      return;
    }

    const existingRun = await this.connectorRepository.findInFlightRun(connector.id);
    if (existingRun !== null) {
      const ageMs = Date.now() - existingRun.startedAt.getTime();
      if (ageMs < ORPHAN_RUN_MAX_AGE_MS) {
        this.logger.debug(`Tick for ${connector.id} skipped — in-flight run ${existingRun.id}`);
        return;
      }
      this.logger.warn(
        `Tick for ${connector.id} recovering orphaned run ${existingRun.id} (age=${String(ageMs)}ms)`,
      );
      await this.connectorRepository.markOrphanedRunsAsFailed(
        new Date(Date.now() - ORPHAN_RUN_MAX_AGE_MS),
        `Orphaned run recovered by tick consumer`,
      );
    }

    try {
      await this.syncManager.syncConnector(connector, true, {
        triggeredBy: payload.triggeredBy,
        runKey: payload.runKey,
      });
    } catch (error) {
      this.logger.error(
        `Sync run failed for connector ${connector.id}`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }

  private parsePayload(raw: unknown): SchedulerTickPayload | null {
    if (typeof raw !== 'object' || raw === null) {
      return null;
    }
    const candidate = raw as Partial<SchedulerTickPayload>;
    if (
      typeof candidate.connectorId !== 'string' ||
      typeof candidate.provider !== 'string' ||
      typeof candidate.userId !== 'string' ||
      typeof candidate.scheduledAt !== 'string' ||
      typeof candidate.triggeredBy !== 'string' ||
      typeof candidate.runKey !== 'string'
    ) {
      return null;
    }
    return candidate as SchedulerTickPayload;
  }

  private isSkippable(connector: WorkspaceConnector): boolean {
    if (!connector.isEnabled) {
      return true;
    }
    const skipStatuses = new Set(['PAUSED', 'PENDING_AUTH', 'DISCONNECTED']);
    return skipStatuses.has(connector.status);
  }
}
