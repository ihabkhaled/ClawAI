import { Injectable, Logger, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common';
import {
  MODEL_SYNC_INITIAL_DELAY_MS,
  MODEL_SYNC_INTERVAL_MS,
  MODEL_SYNC_MAX_JITTER_MS,
} from '../constants/model-sync-schedule.constants';
import { type ScheduledSyncSummary } from '../types/connectors.types';
import { ConnectorsRepository } from '../repositories/connectors.repository';
import { ConnectorsService } from './connectors.service';

/**
 * Re-syncs the model list of every enabled connector that holds a key, every
 * six hours, so a provider's new models (and their prices) appear without an
 * admin pressing Sync. One connector failing never stops the others, and a
 * run that is still going blocks the next one.
 */
@Injectable()
export class ModelSyncSchedulerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ModelSyncSchedulerService.name);
  private timer: NodeJS.Timeout | undefined;
  private running = false;
  private stopped = false;

  constructor(
    private readonly connectorsRepository: ConnectorsRepository,
    private readonly connectorsService: ConnectorsService,
  ) {}

  onModuleInit(): void {
    this.schedule(MODEL_SYNC_INITIAL_DELAY_MS);
  }

  onModuleDestroy(): void {
    this.stopped = true;
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = undefined;
    }
  }

  async runOnce(): Promise<ScheduledSyncSummary> {
    if (this.running) {
      this.logger.warn('runOnce: previous scheduled sync still running, skipping this tick');
      return { attempted: 0, succeeded: 0, failed: 0, skipped: true };
    }
    this.running = true;
    const summary: ScheduledSyncSummary = { attempted: 0, succeeded: 0, failed: 0, skipped: false };
    try {
      const connectors = await this.connectorsRepository.findEnabled();
      for (const connector of connectors.filter((item) => Boolean(item.encryptedConfig))) {
        summary.attempted += 1;
        try {
          await this.connectorsService.syncModels(connector.id);
          summary.succeeded += 1;
        } catch (error: unknown) {
          summary.failed += 1;
          // Id and error class only: a provider error body can echo request data.
          this.logger.warn(
            `runOnce: sync failed connectorId=${connector.id} error=${error instanceof Error ? error.name : 'unknown'}`,
          );
        }
      }
      this.logger.log(
        `runOnce: attempted=${String(summary.attempted)} succeeded=${String(summary.succeeded)} failed=${String(summary.failed)}`,
      );
    } catch (error: unknown) {
      this.logger.error(
        `runOnce: could not list connectors error=${error instanceof Error ? error.name : 'unknown'}`,
      );
    } finally {
      this.running = false;
    }
    return summary;
  }

  private schedule(baseDelayMs: number): void {
    if (this.stopped) {
      return;
    }
    const delay = baseDelayMs + Math.floor(Math.random() * MODEL_SYNC_MAX_JITTER_MS);
    this.timer = setTimeout(() => {
      void this.runOnce().finally(() => {
        this.schedule(MODEL_SYNC_INTERVAL_MS);
      });
    }, delay);
    this.timer.unref();
  }
}
