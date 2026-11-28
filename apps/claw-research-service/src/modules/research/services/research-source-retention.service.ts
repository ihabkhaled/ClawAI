import { Injectable, Logger, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common';

import {
  RESEARCH_SOURCE_RETENTION_DAYS,
  RESEARCH_SOURCE_RETENTION_MS,
  RESEARCH_SOURCE_SWEEP_INTERVAL_MS,
} from '../../../common/constants/research-engine.constants';
import { describeFetchFailure } from '../../../common/utilities/describe-fetch-failure.utility';
import { ResearchSourceRepository } from '../repositories/research-source.repository';

/**
 * Deletes `research_sources` rows older than 30 days, once at boot and then
 * hourly. The timer is unref'd (it never keeps the process alive) and cleared
 * on shutdown. Idempotent: several replicas or a doubled tick are harmless.
 */
@Injectable()
export class ResearchSourceRetentionService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ResearchSourceRetentionService.name);
  private timer: NodeJS.Timeout | null = null;

  constructor(private readonly sources: ResearchSourceRepository) {}

  onModuleInit(): void {
    void this.safeSweep();
    this.timer = setInterval(() => void this.safeSweep(), RESEARCH_SOURCE_SWEEP_INTERVAL_MS);
    this.timer.unref();
  }

  onModuleDestroy(): void {
    if (this.timer !== null) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  /** Returns how many rows were deleted. */
  async sweep(now: Date = new Date()): Promise<number> {
    const deleted = await this.sources.deleteOlderThan(
      new Date(now.getTime() - RESEARCH_SOURCE_RETENTION_MS),
    );
    this.logger.log(
      `research.sources.swept deleted=${String(deleted)} retentionDays=${String(RESEARCH_SOURCE_RETENTION_DAYS)}`,
    );
    return deleted;
  }

  private async safeSweep(): Promise<void> {
    try {
      await this.sweep();
    } catch (error) {
      this.logger.warn(`research.sources.sweep_failed: ${describeFetchFailure(error)}`);
    }
  }
}
