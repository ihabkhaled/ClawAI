import { Injectable, Logger } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { randomUUID } from 'node:crypto';

import { RedisService } from '../../../infrastructure/redis/redis.service';
import {
  THREAD_BUDGET_STALE_AFTER_MS,
  THREAD_BUDGET_SWEEP_BATCH_SIZE,
  THREAD_BUDGET_SWEEP_INTERVAL_MS,
  THREAD_BUDGET_SWEEP_LOCK_KEY,
  THREAD_BUDGET_SWEEP_LOCK_TTL_SECONDS,
} from '../../entitlements/constants/thread-job-budget-retry.constants';
import { ThreadJobBudgetRepository } from '../../entitlements/repositories/thread-job-budget.repository';
import { FeatureSettlement } from '../../quota/enums/feature-settlement.enum';
import { FeatureUsageConsumptionService } from '../../quota/services/feature-usage-consumption.service';
import { ThreadJobBudgetCloseStatus } from '../enums/thread-job-budget-close-status.enum';
import { ThreadJobBudgetService } from './thread-job-budget.service';

/**
 * Closes what a Threads job left open when it died without closing it: a failed
 * enqueue or a crashed worker used to hold the user's spend cap, wallet hold and
 * plan allowance (a Free user's single lifetime Thread) for ever.
 *
 * Both passes are bounded by a batch size, idempotent (a budget another replica
 * closed a moment ago is a no-op) and run under a Redis lock, so scaling
 * auth-service cannot make two replicas fight over the same rows.
 */
@Injectable()
export class ThreadJobBudgetSweeperService {
  private readonly logger = new Logger(ThreadJobBudgetSweeperService.name);

  constructor(
    private readonly redis: RedisService,
    private readonly repository: ThreadJobBudgetRepository,
    private readonly budgets: ThreadJobBudgetService,
    private readonly featureUsage: FeatureUsageConsumptionService,
  ) {}

  @Interval(THREAD_BUDGET_SWEEP_INTERVAL_MS)
  async run(): Promise<void> {
    const ownerToken = randomUUID();
    let acquired = false;
    try {
      acquired = await this.redis.acquireLock(
        THREAD_BUDGET_SWEEP_LOCK_KEY,
        ownerToken,
        THREAD_BUDGET_SWEEP_LOCK_TTL_SECONDS,
      );
      if (!acquired) {
        return;
      }
      const swept = await this.sweep(new Date());
      if (swept.budgets > 0 || swept.features > 0) {
        this.logger.warn(
          `run: closed ${String(swept.budgets)} stale budget(s), released ${String(swept.features)} stranded allowance hold(s)`,
        );
      }
    } catch (error) {
      this.logger.error(`run: failed - ${(error as Error).message}`);
    } finally {
      if (acquired) {
        await this.redis.releaseLock(THREAD_BUDGET_SWEEP_LOCK_KEY, ownerToken).catch(() => false);
      }
    }
  }

  /** One bounded pass. Returns how many budgets it closed and allowance holds it released. */
  async sweep(now: Date): Promise<{ budgets: number; features: number }> {
    const stale = await this.repository.findStaleActive(
      new Date(now.getTime() - THREAD_BUDGET_STALE_AFTER_MS),
      THREAD_BUDGET_SWEEP_BATCH_SIZE,
    );
    let budgets = 0;
    for (const { id } of stale) {
      try {
        if (await this.budgets.close(id, ThreadJobBudgetCloseStatus.RELEASED)) budgets += 1;
      } catch (error) {
        this.logger.error(
          `sweep: budget ${id} left for the next pass - ${(error as Error).message}`,
        );
      }
    }
    const stranded = await this.repository.findStrandedFeatureReservationIds(
      new Date(now.getTime() - THREAD_BUDGET_SWEEP_INTERVAL_MS),
      THREAD_BUDGET_SWEEP_BATCH_SIZE,
    );
    let features = 0;
    for (const id of stranded) {
      try {
        await this.featureUsage.settle(id, FeatureSettlement.RELEASE);
        features += 1;
      } catch (error) {
        this.logger.error(
          `sweep: allowance hold ${id} left for the next pass - ${(error as Error).message}`,
        );
      }
    }
    return { budgets, features };
  }
}
