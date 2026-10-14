import { Injectable, Logger } from '@nestjs/common';

import {
  SPEND_SYNC_MAP_MAX_ENTRIES,
  SPEND_SYNC_MIN_INTERVAL_MS,
} from '../constants/generation.constants';
import { GenerationJobsRepository } from '../repositories/generation-jobs.repository';
import { ThreadBudgetClient } from './thread-budget.client';

/**
 * Copies what a job's budget row has settled onto the job while it runs, so the owner sees the
 * spend grow instead of a flat zero until the budget closes. Best effort and throttled: it never
 * fails the model call it follows and asks auth at most once per interval per job.
 */
@Injectable()
export class GenerationSpendSyncService {
  private readonly logger = new Logger(GenerationSpendSyncService.name);
  private readonly lastSyncAt = new Map<string, number>();

  constructor(
    private readonly budgets: ThreadBudgetClient,
    private readonly repository: GenerationJobsRepository,
  ) {}

  async sync(jobId: string, budgetId: string): Promise<void> {
    const now = Date.now();
    const last = this.lastSyncAt.get(jobId);
    if (last !== undefined && now - last < SPEND_SYNC_MIN_INTERVAL_MS) return;
    this.remember(jobId, now);
    try {
      await this.repository.syncSpend(jobId, await this.budgets.settledMicroUsd(budgetId));
    } catch {
      this.logger.debug(`Running spend could not be synced for job ${jobId}`);
    }
  }

  private remember(jobId: string, now: number): void {
    if (this.lastSyncAt.size >= SPEND_SYNC_MAP_MAX_ENTRIES) {
      for (const [key, at] of this.lastSyncAt) {
        if (now - at >= SPEND_SYNC_MIN_INTERVAL_MS) this.lastSyncAt.delete(key);
      }
    }
    this.lastSyncAt.set(jobId, now);
  }
}
