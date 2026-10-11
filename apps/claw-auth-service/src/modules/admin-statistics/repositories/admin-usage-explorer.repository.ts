import { Injectable } from '@nestjs/common';

import { Prisma } from '../../../generated/prisma';
import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import {
  EXPLORER_DIMENSION_SQL,
  EXPLORER_FILTER_OPTIONS_LIMIT,
  EXPLORER_FROM_SQL,
  EXPLORER_GROUP_SORT_SQL,
  EXPLORER_ROW_SORT_SQL,
  EXPLORER_SUMS_SQL,
  LIKE_ESCAPE_PATTERN,
  ROW_BILLING_KIND_SQL,
  ROW_COST_KIND_SQL,
  ROW_COST_SQL,
} from '../constants/admin-usage-explorer.constants';
import { UsageBillingKind, UsageLeaderboardDimension } from '../enums/usage-cost-kind.enum';
import {
  type ExplorerBucketRow,
  type ExplorerCountRow,
  type ExplorerCursor,
  type ExplorerGroupRow,
  type ExplorerOptionRow,
  type ExplorerRequestRow,
  type ExplorerScope,
  type ExplorerSumsRow,
  type ExplorerUserIdentityRow,
  type GroupPageQuery,
  type RequestPageQuery,
} from '../types/admin-usage-explorer.types';

/**
 * Read-only aggregates behind the admin usage explorer.
 *
 * Every query is bounded: a half-open `created_at` window the service already
 * capped at 90 days, a fixed LIMIT, and parameterised filters. Sort columns and
 * dimensions come from static SQL fragments chosen by enum, so no caller text is
 * ever interpolated into SQL. RELEASED rows (refunded holds) are excluded, the
 * same rule the quota meter and the attribution view use. Nothing here writes.
 */
@Injectable()
export class AdminUsageExplorerRepository {
  constructor(private readonly prisma: PrismaService) {}

  async totals(scope: ExplorerScope): Promise<ExplorerSumsRow | undefined> {
    const rows = await this.prisma.$queryRaw<ExplorerSumsRow[]>`
      SELECT ${EXPLORER_SUMS_SQL} FROM ${EXPLORER_FROM_SQL} WHERE ${this.where(scope)}`;
    return rows[0];
  }

  /** One keyset page of grouped rows; callers ask for `limit` and read one extra to detect more. */
  async groupPage(query: GroupPageQuery): Promise<ExplorerGroupRow[]> {
    const dimension = EXPLORER_DIMENSION_SQL[query.dimension];
    const sortExpr = EXPLORER_GROUP_SORT_SQL[query.sort];
    if (dimension === undefined || sortExpr === undefined) {
      return [];
    }
    const where = this.where(query.scope, this.groupSearch(query.dimension, query.search));
    return this.prisma.$queryRaw<ExplorerGroupRow[]>`
      SELECT * FROM (
        SELECT ${dimension.key} AS group_key, ${dimension.extras}, ${EXPLORER_SUMS_SQL},
          (${sortExpr})::text AS sort_val
        FROM ${EXPLORER_FROM_SQL} WHERE ${where}
        GROUP BY ${dimension.groupBy}
      ) t
      ${this.cursorWhere('t.group_key', query.cursor, query.descending)}
      ORDER BY t.sort_val::numeric ${this.direction(query.descending)}, t.group_key ${this.direction(query.descending)}
      LIMIT ${query.limit}`;
  }

  async distinctUsers(scope: ExplorerScope, search: string | null): Promise<number> {
    const where = this.where(scope, this.groupSearch(UsageLeaderboardDimension.USER, search));
    const rows = await this.prisma.$queryRaw<ExplorerCountRow[]>`
      SELECT COUNT(DISTINCT w.user_id)::int AS total FROM ${EXPLORER_FROM_SQL} WHERE ${where}`;
    return rows[0]?.total ?? 0;
  }

  /** Buckets are bounded by the range cap: at most 168 hourly or 90 daily rows. */
  async series(scope: ExplorerScope, hourly: boolean): Promise<ExplorerBucketRow[]> {
    const trunc = hourly ? Prisma.sql`'hour'` : Prisma.sql`'day'`;
    return this.prisma.$queryRaw<ExplorerBucketRow[]>`
      SELECT date_trunc(${trunc}, w.created_at AT TIME ZONE 'UTC') AT TIME ZONE 'UTC' AS bucket_start,
        ${EXPLORER_SUMS_SQL}
      FROM ${EXPLORER_FROM_SQL} WHERE ${this.where(scope)}
      GROUP BY 1 ORDER BY 1 ASC`;
  }

  /** One keyset page of single ledger rows. Safe fields only: no prompt, response or key ever lives here. */
  async requestPage(query: RequestPageQuery): Promise<ExplorerRequestRow[]> {
    const sortExpr = EXPLORER_ROW_SORT_SQL[query.sort];
    if (sortExpr === undefined) {
      return [];
    }
    const where = this.where(query.scope, this.requestSearch(query.search));
    return this.prisma.$queryRaw<ExplorerRequestRow[]>`
      SELECT t.id, t.created_at, t.provider, t.model, t.workflow, t.state,
        t.input_tokens, t.output_tokens, t.cached_tokens, t.cache_write_tokens,
        t.reasoning_tokens, t.weighted_tokens, t.tool_call_count,
        t.cost_micro_usd, t.cost_kind, t.billing, t.sort_val
      FROM (
        SELECT w.id, w.created_at, w.provider, w.model, w.workflow, w.state::text AS state,
          w.raw_input_tokens AS input_tokens, w.raw_output_tokens AS output_tokens,
          w.raw_cached_tokens AS cached_tokens, w.raw_cache_write_tokens AS cache_write_tokens,
          w.raw_reasoning_tokens AS reasoning_tokens, w.weighted_tokens, w.tool_call_count,
          COALESCE(${ROW_COST_SQL}, 0)::text AS cost_micro_usd,
          ${ROW_COST_KIND_SQL} AS cost_kind,
          ${ROW_BILLING_KIND_SQL} AS billing,
          (${sortExpr})::text AS sort_val
        FROM ${EXPLORER_FROM_SQL} WHERE ${where}
      ) t
      ${this.cursorWhere('t.id', query.cursor, query.descending)}
      ORDER BY t.sort_val::numeric ${this.direction(query.descending)}, t.id ${this.direction(query.descending)}
      LIMIT ${query.limit}`;
  }

  async providerOptions(scope: ExplorerScope): Promise<ExplorerOptionRow[]> {
    return this.prisma.$queryRaw<ExplorerOptionRow[]>`
      SELECT k.provider_key AS value FROM ${EXPLORER_FROM_SQL} WHERE ${this.where(scope)}
      GROUP BY k.provider_key ORDER BY COUNT(*) DESC LIMIT ${EXPLORER_FILTER_OPTIONS_LIMIT}`;
  }

  async modelOptions(scope: ExplorerScope): Promise<ExplorerOptionRow[]> {
    return this.prisma.$queryRaw<ExplorerOptionRow[]>`
      SELECT w.model AS value FROM ${EXPLORER_FROM_SQL} WHERE ${this.where(scope)}
      GROUP BY w.model ORDER BY COUNT(*) DESC LIMIT ${EXPLORER_FILTER_OPTIONS_LIMIT}`;
  }

  async workflowOptions(scope: ExplorerScope): Promise<ExplorerOptionRow[]> {
    return this.prisma.$queryRaw<ExplorerOptionRow[]>`
      SELECT k.workflow_key AS value FROM ${EXPLORER_FROM_SQL} WHERE ${this.where(scope)}
      GROUP BY k.workflow_key ORDER BY COUNT(*) DESC LIMIT ${EXPLORER_FILTER_OPTIONS_LIMIT}`;
  }

  async findUserIdentity(userId: string): Promise<ExplorerUserIdentityRow | null> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, username: true, role: true, status: true },
    });
    return user === null
      ? null
      : {
          id: user.id,
          email: user.email,
          username: user.username,
          role: String(user.role),
          status: String(user.status),
        };
  }

  private direction(descending: boolean): Prisma.Sql {
    return descending ? Prisma.sql`DESC` : Prisma.sql`ASC`;
  }

  /** Keyset condition on (sort value, key). Both sides are bound parameters. */
  private cursorWhere(
    keyColumn: string,
    cursor: ExplorerCursor | null,
    descending: boolean,
  ): Prisma.Sql {
    if (cursor === null) {
      return Prisma.empty;
    }
    const key = Prisma.raw(keyColumn);
    return descending
      ? Prisma.sql`WHERE (t.sort_val::numeric, ${key}) < (${cursor.v}::numeric, ${cursor.id})`
      : Prisma.sql`WHERE (t.sort_val::numeric, ${key}) > (${cursor.v}::numeric, ${cursor.id})`;
  }

  private likePattern(search: string): string {
    return `%${search.replace(LIKE_ESCAPE_PATTERN, '\\$&')}%`;
  }

  private groupSearch(
    dimension: UsageLeaderboardDimension,
    search: string | null,
  ): Prisma.Sql | null {
    if (search === null) {
      return null;
    }
    const pattern = this.likePattern(search);
    switch (dimension) {
      case UsageLeaderboardDimension.USER:
        return Prisma.sql`(u.email ILIKE ${pattern} OR u.username ILIKE ${pattern} OR w.user_id = ${search})`;
      case UsageLeaderboardDimension.PROVIDER:
        return Prisma.sql`(w.provider ILIKE ${pattern} OR k.provider_key ILIKE ${pattern})`;
      case UsageLeaderboardDimension.MODEL:
        return Prisma.sql`(w.model ILIKE ${pattern} OR w.provider ILIKE ${pattern})`;
      case UsageLeaderboardDimension.WORKFLOW:
        return Prisma.sql`k.workflow_key ILIKE ${pattern}`;
    }
  }

  private requestSearch(search: string | null): Prisma.Sql | null {
    if (search === null) {
      return null;
    }
    const pattern = this.likePattern(search);
    return Prisma.sql`(w.model ILIKE ${pattern} OR w.provider ILIKE ${pattern} OR k.workflow_key ILIKE ${pattern})`;
  }

  private billingClause(billing: UsageBillingKind): Prisma.Sql {
    switch (billing) {
      case UsageBillingKind.CREDIT:
        return Prisma.sql`w.is_payg`;
      case UsageBillingKind.ALLOWANCE:
        return Prisma.sql`(NOT w.is_payg AND w.is_free_allowance)`;
      case UsageBillingKind.UNMETERED:
        return Prisma.sql`(NOT w.is_payg AND NOT w.is_free_allowance AND u.role::text = 'ADMIN')`;
      case UsageBillingKind.PLAN:
        return Prisma.sql`(NOT w.is_payg AND NOT w.is_free_allowance AND (u.role IS NULL OR u.role::text <> 'ADMIN'))`;
    }
  }

  private where(scope: ExplorerScope, extra: Prisma.Sql | null = null): Prisma.Sql {
    const parts: Prisma.Sql[] = [
      Prisma.sql`w.created_at >= ${scope.from} AND w.created_at < ${scope.to} AND w.state <> 'RELEASED'`,
    ];
    if (scope.userId !== null) {
      parts.push(Prisma.sql`w.user_id = ${scope.userId}`);
    }
    if (scope.provider !== null) {
      parts.push(Prisma.sql`k.provider_key = ${scope.provider}`);
    }
    if (scope.model !== null) {
      parts.push(Prisma.sql`w.model = ${scope.model}`);
    }
    if (scope.workflow !== null) {
      parts.push(Prisma.sql`k.workflow_key = ${scope.workflow}`);
    }
    if (scope.billing !== null) {
      parts.push(this.billingClause(scope.billing));
    }
    if (extra !== null) {
      parts.push(extra);
    }
    return Prisma.join(parts, ' AND ');
  }
}
