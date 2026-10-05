import { Injectable } from '@nestjs/common';
import { type AdminUsageBucketGrain } from '@claw/shared-types';

import { Prisma } from '../../../generated/prisma';
import { USAGE_SUMS_SQL } from '../constants/admin-usage-analytics.constants';
import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import {
  type UsageActiveUsersRow,
  type UsageBucketRow,
  type UsageCreditRow,
  type UsageModelRow,
  type UsageQueryScope,
  type UsageSumsRow,
  type UsageToolRow,
  type UsageUserRow,
  type UsageWorkflowRow,
} from '../types/admin-usage-analytics.types';

/**
 * Read-only aggregates over the weighted-usage and feature-usage ledgers.
 *
 * Every query is bounded three ways: a half-open `created_at` window the
 * caller already capped at 90 days, a fixed `LIMIT` on every GROUP BY, and a
 * parameterised user filter. RELEASED rows (refunded holds) are excluded, the
 * same rule the quota meter and the attribution view use. Nothing here writes.
 */
@Injectable()
export class AdminUsageAnalyticsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async totals(scope: UsageQueryScope): Promise<UsageSumsRow | undefined> {
    const rows = await this.prisma.$queryRaw<UsageSumsRow[]>`
      SELECT ${USAGE_SUMS_SQL} FROM weighted_usage_records WHERE ${this.where(scope)}`;
    return rows[0];
  }

  /** Credit-connector use over the WHOLE window, so a truncated model list cannot undercount it. */
  async creditSums(scope: UsageQueryScope): Promise<UsageCreditRow | undefined> {
    const rows = await this.prisma.$queryRaw<UsageCreditRow[]>`
      SELECT
        COUNT(*) FILTER (WHERE is_payg)::int AS credit_requests,
        COUNT(*) FILTER (WHERE is_free_allowance)::int AS free_requests,
        COALESCE(SUM(credit_grant_micro_usd + credit_purchased_micro_usd), 0)::text AS wallet_micro_usd
      FROM weighted_usage_records WHERE ${this.where(scope)}`;
    return rows[0];
  }

  async activeUsers(scope: UsageQueryScope): Promise<number> {
    const rows = await this.prisma.$queryRaw<UsageActiveUsersRow[]>`
      SELECT COUNT(DISTINCT user_id)::int AS active_users
      FROM weighted_usage_records WHERE ${this.where(scope)}`;
    return rows[0]?.active_users ?? 0;
  }

  /** One page of provider/model lines; callers ask for `limit + 1` to detect truncation. */
  async byModel(scope: UsageQueryScope, limit: number): Promise<UsageModelRow[]> {
    return this.prisma.$queryRaw<UsageModelRow[]>`
      SELECT provider, model, ${USAGE_SUMS_SQL},
        COUNT(*) FILTER (WHERE is_payg)::int AS credit_requests,
        COUNT(*) FILTER (WHERE is_free_allowance)::int AS free_requests,
        COALESCE(SUM(credit_grant_micro_usd + credit_purchased_micro_usd), 0)::text AS wallet_micro_usd
      FROM weighted_usage_records WHERE ${this.where(scope)}
      GROUP BY provider, model
      ORDER BY SUM(COALESCE(actual_cost_micro_usd, estimated_cost_micro_usd)) DESC, COUNT(*) DESC
      LIMIT ${limit}`;
  }

  async byUser(scope: UsageQueryScope, limit: number): Promise<UsageUserRow[]> {
    return this.prisma.$queryRaw<UsageUserRow[]>`
      SELECT user_id, ${USAGE_SUMS_SQL}
      FROM weighted_usage_records WHERE ${this.where(scope)}
      GROUP BY user_id
      ORDER BY SUM(COALESCE(actual_cost_micro_usd, estimated_cost_micro_usd)) DESC, COUNT(*) DESC
      LIMIT ${limit}`;
  }

  async byWorkflow(scope: UsageQueryScope, limit: number): Promise<UsageWorkflowRow[]> {
    return this.prisma.$queryRaw<UsageWorkflowRow[]>`
      SELECT workflow, COUNT(*)::int AS requests
      FROM weighted_usage_records WHERE ${this.where(scope)}
      GROUP BY workflow ORDER BY COUNT(*) DESC LIMIT ${limit}`;
  }

  /** Buckets are bounded by the range cap: at most 168 hourly or 90 daily rows. */
  async series(scope: UsageQueryScope, grain: AdminUsageBucketGrain): Promise<UsageBucketRow[]> {
    const trunc = grain === 'HOUR' ? Prisma.sql`'hour'` : Prisma.sql`'day'`;
    return this.prisma.$queryRaw<UsageBucketRow[]>`
      SELECT date_trunc(${trunc}, created_at AT TIME ZONE 'UTC') AT TIME ZONE 'UTC' AS bucket_start, ${USAGE_SUMS_SQL}
      FROM weighted_usage_records WHERE ${this.where(scope)}
      GROUP BY 1 ORDER BY 1 ASC`;
  }

  /** Gated tools delivered in the window. Counted at consumption, not reservation. */
  async tools(scope: UsageQueryScope, limit: number): Promise<UsageToolRow[]> {
    const rows = await this.prisma.featureUsageRecord.groupBy({
      by: ['feature'],
      where: {
        state: 'CONSUMED',
        consumedAt: { gte: scope.from, lt: scope.to },
        ...(scope.userId === null ? {} : { userId: scope.userId }),
      },
      _count: { _all: true },
      orderBy: { _count: { feature: 'desc' } },
      take: limit,
    });
    return rows.map((row) => ({ feature: row.feature, count: row._count._all }));
  }

  async emailsFor(userIds: string[]): Promise<Map<string, string>> {
    if (userIds.length === 0) {
      return new Map();
    }
    const users = await this.prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, email: true },
    });
    return new Map(users.map((user) => [user.id, user.email]));
  }

  private where(scope: UsageQueryScope): Prisma.Sql {
    const user = scope.userId === null ? Prisma.empty : Prisma.sql`AND user_id = ${scope.userId}`;
    return Prisma.sql`created_at >= ${scope.from} AND created_at < ${scope.to}
      AND state <> 'RELEASED' ${user}`;
  }
}
