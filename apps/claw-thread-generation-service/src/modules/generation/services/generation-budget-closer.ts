import { Logger } from '@nestjs/common';

import { type GenerationBudgetCloseStatus } from '../../../common/enums/generation-budget-close-status.enum';
import { BUDGET_CLOSE_MAX_ATTEMPTS } from '../constants/generation.constants';
import { type GenerationJobsRepository } from '../repositories/generation-jobs.repository';
import { ThreadBudgetCloseRefusedError } from '../utilities/thread-budget-close-refused.error';
import { type ThreadBudgetClient } from './thread-budget.client';

const REASON_REFUSED = 'the budget service refused to close it (a model call is still reserved)';
const REASON_UNAVAILABLE = 'the budget service could not be reached or failed';

/**
 * Closes a job's budget and keeps the retry bookkeeping bounded. A failed close is counted on the
 * job and retried by the recovery sweep with exponential back-off; after BUDGET_CLOSE_MAX_ATTEMPTS
 * it is given up. The first failure logs a warning with the reason, the last logs one error, and
 * the tries in between are silent, so a stuck budget produces two log lines, not one per sweep.
 */
export class GenerationBudgetCloser {
  private readonly logger = new Logger(GenerationBudgetCloser.name);

  constructor(
    private readonly budgets: ThreadBudgetClient,
    private readonly repository: GenerationJobsRepository,
  ) {}

  async close(jobId: string, budgetId: string, status: GenerationBudgetCloseStatus): Promise<void> {
    await this.syncSpend(jobId, budgetId);
    try {
      await this.budgets.close(budgetId, status);
      await this.repository.markBudgetClosed(jobId, status);
    } catch (error: unknown) {
      await this.recordFailure(jobId, budgetId, status, error);
    }
  }

  /**
   * Persists what the budget row settled, so the owner's progress shows the real spend for every
   * billing mode. Bookkeeping only: a failure here never blocks the close.
   */
  private async syncSpend(jobId: string, budgetId: string): Promise<void> {
    try {
      await this.repository.syncSpend(jobId, await this.budgets.spentMicroUsd(budgetId));
    } catch {
      this.logger.debug(`Generation spend could not be synced for job ${jobId}`);
    }
  }

  private async recordFailure(
    jobId: string,
    budgetId: string,
    status: GenerationBudgetCloseStatus,
    error: unknown,
  ): Promise<void> {
    const reason =
      error instanceof ThreadBudgetCloseRefusedError ? REASON_REFUSED : REASON_UNAVAILABLE;
    try {
      const state = await this.repository.recordBudgetCloseFailure(jobId);
      if (!state) return;
      if (state.abandoned) {
        this.logger.error(
          `Generation budget close given up after ${String(state.attempts)} tries (${status}) for job ${jobId}, budget ${budgetId}: ${reason}`,
        );
      } else if (state.attempts === 1) {
        this.logger.warn(
          `Generation budget close failed (${status}) for job ${jobId}, budget ${budgetId}: ${reason}; retrying with back-off, up to ${String(BUDGET_CLOSE_MAX_ATTEMPTS)} tries`,
        );
      }
    } catch {
      this.logger.warn(`Generation budget close failed (${status}) for job ${jobId}: ${reason}`);
    }
  }
}
