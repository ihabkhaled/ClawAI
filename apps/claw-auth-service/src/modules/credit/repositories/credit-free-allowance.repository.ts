import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'node:crypto';

import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import {
  type CreditFreeAllowanceCounterKey,
  type CreditFreeAllowanceUsageRow,
} from '../types/credit.types';

/**
 * The free-allowance counter (ADR-142): one row per (user, provider, UTC month).
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
   * Takes one slot if the counter is below `limit`. True when the slot was taken.
   *
   * A limit below 1 never admits: the INSERT arm of the upsert has no `WHERE`, so
   * it is refused here before the statement is sent.
   */
  async tryConsume(key: CreditFreeAllowanceCounterKey, limit: number): Promise<boolean> {
    if (limit < 1) {
      return false;
    }
    this.logger.debug(`tryConsume: provider=${key.provider} period=${key.periodKey}`);
    const rows = await this.prisma.$queryRaw<{ used_count: number }[]>`
      INSERT INTO credit_free_allowance_usage
        (id, user_id, provider, period_key, used_count, created_at, updated_at)
      VALUES (${randomUUID()}, ${key.userId}, ${key.provider}, ${key.periodKey}, 1, now(), now())
      ON CONFLICT (user_id, provider, period_key)
      DO UPDATE SET
        used_count = credit_free_allowance_usage.used_count + 1,
        updated_at = now()
      WHERE credit_free_allowance_usage.used_count < ${limit}
      RETURNING used_count
    `;
    return rows.length > 0;
  }

  /** Gives one slot back, never below zero. A missing row is a no-op. */
  async giveBack(key: CreditFreeAllowanceCounterKey): Promise<void> {
    this.logger.debug(`giveBack: provider=${key.provider} period=${key.periodKey}`);
    await this.prisma.$executeRaw`
      UPDATE credit_free_allowance_usage
      SET used_count = GREATEST(used_count - 1, 0), updated_at = now()
      WHERE user_id = ${key.userId}
        AND provider = ${key.provider}
        AND period_key = ${key.periodKey}
    `;
  }

  /** Every provider counter the user has touched in one month. */
  async findForUserPeriod(
    userId: string,
    periodKey: string,
  ): Promise<CreditFreeAllowanceUsageRow[]> {
    const rows = await this.prisma.creditFreeAllowanceUsage.findMany({
      where: { userId, periodKey },
      select: { provider: true, usedCount: true },
    });
    return rows;
  }
}
