import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'node:crypto';

import { RedisService } from '../../../infrastructure/redis/redis.service';
import type { ScheduledJobCallback, ScheduledJobOptions } from '../types/scheduled-job.types';

@Injectable()
export class ScheduledJobRunnerService {
  private readonly logger = new Logger(ScheduledJobRunnerService.name);

  constructor(private readonly redis: RedisService) {}

  async run<TResult>(
    options: ScheduledJobOptions,
    callback: ScheduledJobCallback<TResult>,
  ): Promise<TResult | null> {
    this.logger.debug(`run: job=${options.jobName}`);
    const ownerToken = randomUUID();
    let acquired = false;
    try {
      acquired = await this.redis.acquireLock(options.lockKey, ownerToken, options.lockTtlSeconds);
      if (!acquired) {
        this.logger.warn(`run: skipped job=${options.jobName} reason=lock_contended`);
        return null;
      }
      return await callback();
    } catch (error) {
      this.logger.error(`run: failed job=${options.jobName} — ${(error as Error).message}`);
      throw error;
    } finally {
      if (acquired) {
        await this.release(options, ownerToken);
      }
    }
  }

  private async release(options: ScheduledJobOptions, ownerToken: string): Promise<void> {
    try {
      const released = await this.redis.releaseLock(options.lockKey, ownerToken);
      if (!released) {
        this.logger.warn(`release: lock not owned job=${options.jobName}`);
      }
    } catch (error) {
      this.logger.error(`release: failed job=${options.jobName} — ${(error as Error).message}`);
    }
  }
}
