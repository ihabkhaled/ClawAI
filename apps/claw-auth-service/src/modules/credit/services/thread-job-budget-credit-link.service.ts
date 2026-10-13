import { Injectable, Logger } from '@nestjs/common';

import { ThreadJobBudgetRepository } from '../../entitlements/repositories/thread-job-budget.repository';
import { remainingBudgetMicroUsd } from '../../entitlements/utilities/thread-job-budget-transaction.utility';
import { toSafeBalanceNumber } from '../utilities/credit-bucket.utility';

/**
 * Where a credit hold meets the Threads job budget it was taken for.
 *
 * Two jobs, both because only auth-service knows the real numbers:
 * - how much of the job's cap is left, so a hold is SIZED to fit it instead of
 *   being refused for being bigger than the cap (an unpriced model's fallback
 *   price held 511k micro-USD against a 300k cap);
 * - what the user was really charged when the hold settled, so the budget counts
 *   spend rather than the hold. The settled cost is not disclosed to every
 *   billing mode, so the budget cannot learn it from the finalize reply.
 *
 * Never throws: the credit hold is the money path and must not fail on
 * bookkeeping. A missed settlement is finished by the caller's own finalize call
 * (at the hold, the conservative figure) and by the budget close.
 */
@Injectable()
export class ThreadJobBudgetCreditLinkService {
  private readonly logger = new Logger(ThreadJobBudgetCreditLinkService.name);

  constructor(private readonly budgets: ThreadJobBudgetRepository) {}

  /**
   * What the job's budget can still carry, as a safe integer of micro-USD, or
   * `undefined` when the request is not a budgeted Threads call (or the budget
   * cannot be read, in which case the call-reserve step still enforces the cap).
   * A closed or missing budget carries nothing.
   */
  async spendCeilingMicroUsd(budgetId: string | undefined): Promise<number | undefined> {
    if (budgetId === undefined) {
      return undefined;
    }
    try {
      const budget = await this.budgets.get(budgetId);
      return budget?.status === 'ACTIVE' ? toSafeBalanceNumber(remainingBudgetMicroUsd(budget)) : 0;
    } catch (error) {
      this.logger.warn(`spendCeilingMicroUsd: unreadable budget ${budgetId} - ${String(error)}`);
      return undefined;
    }
  }

  /** Settles the budget call that carries this hold at what the user was charged. */
  async settleForReservation(reservationId: string, chargedMicroUsd: bigint): Promise<void> {
    try {
      await this.budgets.settleByCreditReservation(reservationId, chargedMicroUsd);
    } catch (error) {
      this.logger.warn(
        `settleForReservation: ${reservationId} left to the caller - ${String(error)}`,
      );
    }
  }
}
