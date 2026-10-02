import { Injectable, Logger, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common';

import {
  RUNTIME_CRAWL_DAY_MS,
  RUNTIME_CRAWL_PURGE_INTERVAL_MS,
} from '../constants/runtime-crawl.constants';
import { RuntimeCrawlRunRepository } from '../repositories/runtime-crawl-run.repository';
import { RuntimeCrawlConfigService } from './runtime-crawl-config.service';

/**
 * Purges finished crawl runs (and, by FK cascade, their pages) older than the
 * DB-level `retentionDays`. `null` keeps everything; `0` keeps nothing beyond
 * the 24 h window the daily caps are measured over, so a purge can never
 * erase the usage the caps depend on. A RUNNING run is never deleted. The
 * sweep is idempotent, so a restart, a doubled tick or several replicas are
 * all harmless.
 */
@Injectable()
export class RuntimeCrawlRetentionService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RuntimeCrawlRetentionService.name);
  private timer: NodeJS.Timeout | null = null;

  constructor(
    private readonly config: RuntimeCrawlConfigService,
    private readonly runs: RuntimeCrawlRunRepository,
  ) {}

  onModuleInit(): void {
    void this.safePurge();
    this.timer = setInterval(() => void this.safePurge(), RUNTIME_CRAWL_PURGE_INTERVAL_MS);
    this.timer.unref();
  }

  onModuleDestroy(): void {
    if (this.timer !== null) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  /** Returns how many runs were deleted; 0 when retention is unlimited. */
  async purge(now: Date = new Date()): Promise<number> {
    const { retentionDays } = await this.config.get();
    if (retentionDays === null) {
      return 0;
    }
    const days = Math.max(retentionDays, 1);
    const deleted = await this.runs.deleteFinishedBefore(
      new Date(now.getTime() - days * RUNTIME_CRAWL_DAY_MS),
    );
    if (deleted > 0) {
      this.logger.log(`runtime_crawl.purged runs=${String(deleted)} retentionDays=${String(days)}`);
    }
    return deleted;
  }

  private async safePurge(): Promise<void> {
    try {
      await this.purge();
    } catch (error) {
      this.logger.warn(
        `runtime_crawl.purge_failed ${error instanceof Error ? error.message : 'unknown'}`,
      );
    }
  }
}
