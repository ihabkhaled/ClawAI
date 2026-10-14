import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import { FREE_ALLOWANCE_TOTAL_COUNTER_KEY } from '../constants/credit-free-allowance.constants';
import { type FreeMeterMonthSum } from '../../entitlements/types/thread-job-budget.types';

/**
 * Where a Threads job's budget meets the Free plan's money meter (ADR-162 addendum).
 *
 * A Free-plan call is a `weighted_usage_records` row with `is_free_allowance`, linked to the job
 * through the budget call's `credit_reservation_id`. The meter (`credit_free_allowance_usage`)
 * carries a call's worst-case hold while it is in flight and its real cost once it finished.
 */
@Injectable()
export class ThreadJobBudgetFreeMeterRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * What the Free meter currently charges for this job's calls: finished calls at their real
   * cost, in-flight calls at their hold. Zero for a non-free job and after the refund.
   */
  async chargedMicroUsd(budgetId: string): Promise<bigint> {
    const rows = await this.prisma.$queryRaw<{ micro_usd: bigint }[]>`
      SELECT COALESCE(SUM(
        CASE w.state
          WHEN 'FINALIZED' THEN COALESCE(w.actual_cost_micro_usd, 0)
          WHEN 'RESERVED' THEN w.estimated_cost_micro_usd
          ELSE 0
        END), 0)::bigint AS micro_usd
      FROM thread_job_budgets b
      JOIN thread_job_budget_calls c ON c.budget_id = b.id
      JOIN weighted_usage_records w ON w.reservation_id = c.credit_reservation_id
      WHERE b.id = ${budgetId}
        AND b.free_refunded_at IS NULL
        AND w.is_free_allowance = true
        AND w.user_id = b.user_id
    `;
    return rows[0]?.micro_usd ?? 0n;
  }

  /**
   * Gives the finished free calls' cost back to the month each was charged to. Exactly once:
   * the marker claim and the meter update commit in ONE transaction, so a crash leaves neither
   * (the retry redoes both) and a second or concurrent close finds the marker set and does
   * nothing. Returns the refunded micro-USD (0 when nothing to refund or already refunded).
   * In-flight calls are not counted here: closing the budget releases them, and a release
   * returns their hold itself.
   */
  refundFinishedCalls(budgetId: string): Promise<bigint> {
    return this.prisma.$transaction(async (tx) => {
      const claimed = await tx.threadJobBudget.updateMany({
        where: { id: budgetId, freeRefundedAt: null },
        data: { freeRefundedAt: new Date() },
      });
      if (claimed.count === 0) {
        return 0n;
      }
      const sums = await tx.$queryRaw<FreeMeterMonthSum[]>`
        SELECT w.month_key AS month_key,
               COALESCE(SUM(COALESCE(w.actual_cost_micro_usd, 0)), 0)::bigint AS micro_usd
        FROM thread_job_budgets b
        JOIN thread_job_budget_calls c ON c.budget_id = b.id
        JOIN weighted_usage_records w ON w.reservation_id = c.credit_reservation_id
        WHERE b.id = ${budgetId}
          AND w.is_free_allowance = true
          AND w.state = 'FINALIZED'
          AND w.user_id = b.user_id
        GROUP BY w.month_key
      `;
      let refunded = 0n;
      for (const { month_key: monthKey, micro_usd: microUsd } of sums) {
        if (microUsd <= 0n) {
          continue;
        }
        await tx.$executeRaw`
          UPDATE credit_free_allowance_usage u
          SET spent_micro_usd = GREATEST(u.spent_micro_usd - ${microUsd}::bigint, 0),
              updated_at = now()
          FROM thread_job_budgets b
          WHERE b.id = ${budgetId}
            AND u.user_id = b.user_id
            AND u.provider = ${FREE_ALLOWANCE_TOTAL_COUNTER_KEY}
            AND u.period_key = ${monthKey}
        `;
        refunded += microUsd;
      }
      return refunded;
    });
  }
}
