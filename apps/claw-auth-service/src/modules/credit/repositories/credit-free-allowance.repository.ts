import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'node:crypto';

import { FREE_ALLOWANCE_TOTAL_COUNTER_KEY } from '../constants/credit-free-allowance.constants';
import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import { type CreditFreeAllowanceCounterKey } from '../types/credit.types';

/**
 * The free-allowance counter (ADR-142): one row per (user, UTC month): provider is always the total key.
 *
 * The admission is ONE statement, `INSERT .. ON CONFLICT DO UPDATE .. WHERE
 * used_count < limit`. Postgres serialises concurrent conflicting upserts on the
 * unique index row, so two parallel requests cannot both take the last slot: the
 * loser's `WHERE` is evaluated against the winner's committed row and matches
 * nothing. A read-then-write here would be exactly the race this table exists to
 * prevent.
 */
@Injectable()
export class CreditFreeAllowanceRepository {
  private readonly logger = new Logger(CreditFreeAllowanceRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Takes one slot if the counter is below `limit` AND, when the plan has a meter, the month's
   * held-plus-used cost can still carry `holdMicroUsd` (ADR-162). True when the slot was taken.
   *
   * A limit below 1 never admits, and neither does a hold bigger than the whole budget: the
   * INSERT arm of the upsert has no `WHERE`, so both are refused here before the statement is sent.
   */
  async tryConsume(
    key: CreditFreeAllowanceCounterKey,
    limit: number,
    holdMicroUsd: bigint,
    budgetMicroUsd: bigint | null,
  ): Promise<boolean> {
    if (limit < 1 || (budgetMicroUsd !== null && holdMicroUsd > budgetMicroUsd)) {
      return false;
    }
    this.logger.debug(`tryConsume: provider=${key.provider} period=${key.periodKey}`);
    const rows = await this.prisma.$queryRaw<{ used_count: number }[]>`
      INSERT INTO credit_free_allowance_usage
        (id, user_id, provider, period_key, used_count, spent_micro_usd, created_at, updated_at)
      VALUES (${randomUUID()}, ${key.userId}, ${key.provider}, ${key.periodKey}, 1, ${holdMicroUsd}::bigint, now(), now())
      ON CONFLICT (user_id, provider, period_key)
      DO UPDATE SET
        used_count = credit_free_allowance_usage.used_count + 1,
        spent_micro_usd = credit_free_allowance_usage.spent_micro_usd + ${holdMicroUsd}::bigint,
        updated_at = now()
      WHERE credit_free_allowance_usage.used_count < ${limit}
        AND (${budgetMicroUsd}::bigint IS NULL
          OR credit_free_allowance_usage.spent_micro_usd + ${holdMicroUsd}::bigint <= ${budgetMicroUsd}::bigint)
      RETURNING used_count
    `;
    return rows.length > 0;
  }

  /** Gives one slot and its held cost back, never below zero. A missing row is a no-op. */
  async giveBack(key: CreditFreeAllowanceCounterKey, holdMicroUsd: bigint): Promise<void> {
    this.logger.debug(`giveBack: provider=${key.provider} period=${key.periodKey}`);
    await this.prisma.$executeRaw`
      UPDATE credit_free_allowance_usage
      SET used_count = GREATEST(used_count - 1, 0),
          spent_micro_usd = GREATEST(spent_micro_usd - ${holdMicroUsd}::bigint, 0),
          updated_at = now()
      WHERE user_id = ${key.userId}
        AND provider = ${key.provider}
        AND period_key = ${key.periodKey}
    `;
  }

  /**
   * Replaces the cost a finished call held with what it really cost: `deltaMicroUsd` is actual
   * minus held, so a cheap call frees budget for the next one. Never below zero.
   */
  async adjustSpend(key: CreditFreeAllowanceCounterKey, deltaMicroUsd: bigint): Promise<void> {
    await this.prisma.$executeRaw`
      UPDATE credit_free_allowance_usage
      SET spent_micro_usd = GREATEST(spent_micro_usd + ${deltaMicroUsd}::bigint, 0),
          updated_at = now()
      WHERE user_id = ${key.userId}
        AND provider = ${key.provider}
        AND period_key = ${key.periodKey}
    `;
  }

  /** The user's total for one month (the single `*` counter): requests and cost, zero when no row exists. */
  async findTotals(
    userId: string,
    periodKey: string,
  ): Promise<{ usedCount: number; spentMicroUsd: bigint }> {
    const row = await this.prisma.creditFreeAllowanceUsage.findUnique({
      where: {
        userId_provider_periodKey: {
          userId,
          provider: FREE_ALLOWANCE_TOTAL_COUNTER_KEY,
          periodKey,
        },
      },
      select: { usedCount: true, spentMicroUsd: true },
    });
    return { usedCount: row?.usedCount ?? 0, spentMicroUsd: row?.spentMicroUsd ?? 0n };
  }
}
