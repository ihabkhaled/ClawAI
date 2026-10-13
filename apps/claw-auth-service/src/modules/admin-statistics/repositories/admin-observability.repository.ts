import { Injectable } from '@nestjs/common';

import { Prisma } from '../../../generated/prisma';
import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import {
  OBS_DIMENSION_SQL,
  OBS_FILTER_OPTIONS_LIMIT,
  OBS_FROM_SQL,
  OBS_NO_PLAN_KEY,
  OBS_PLAN_ID_SQL,
  OBS_PLAN_KEY_SQL,
  OBS_PLAN_OPTIONS_LIMIT,
  OBS_SETTLED_SQL,
  OBS_SORT_SQL,
  OBS_STALE_RESERVED_SQL,
  OBS_STATEMENT_TIMEOUT_SQL,
  OBS_SUMS_SQL,
  OBS_TRANSACTION_MAX_WAIT_MS,
  OBS_TRANSACTION_TIMEOUT_MS,
} from '../constants/admin-observability.constants';
import {
  LIKE_ESCAPE_PATTERN,
  ROW_BILLING_KIND_SQL,
  ROW_COST_SQL,
} from '../constants/admin-usage-explorer.constants';
import { ObservabilityEntity, UsageBillingKind } from '../enums/usage-cost-kind.enum';
import {
  type ObservabilityActivityRow,
  type ObservabilityBillingRow,
  type ObservabilityBucketRow,
  type ObservabilityCountsRow,
  type ObservabilityEntityPageQuery,
  type ObservabilityGroupRow,
  type ObservabilityGroupTarget,
  type ObservabilityHealthRow,
  type ObservabilityPeopleRow,
  type ObservabilityPlanOptionRow,
  type ObservabilityScope,
  type ObservabilitySignupRow,
  type ObservabilitySumsRow,
} from '../types/admin-observability.types';
import { type ExplorerOptionRow } from '../types/admin-usage-explorer.types';

/**
 * Read-only aggregates behind the split observability pages.
 *
 * Every query is bounded: a half-open `created_at` window the service already
 * capped at 90 days, a fixed LIMIT, and parameterised filters. Every window read
 * also runs under `SET LOCAL statement_timeout` (`withTimeout`), so one slow scan
 * is cancelled instead of holding a pooled connection. Sort columns and
 * entities come from static SQL fragments chosen by enum, so no caller text is
 * ever interpolated. Business queries exclude RELEASED rows (refunded holds), the
 * same rule the quota meter uses; only the health queries look at them. Nothing
 * here writes.
 */
@Injectable()
export class AdminObservabilityRepository {
  constructor(private readonly prisma: PrismaService) {}

  async totals(scope: ObservabilityScope): Promise<ObservabilitySumsRow | undefined> {
    const rows = await this.withTimeout(
      (tx) =>
        tx.$queryRaw<ObservabilitySumsRow[]>`
      SELECT ${OBS_SUMS_SQL} FROM ${OBS_FROM_SQL} WHERE ${this.where(scope)}`,
    );
    return rows[0];
  }

  /** One offset page of grouped rows. `total_groups` is the group count across all pages. */
  async entityPage(query: ObservabilityEntityPageQuery): Promise<ObservabilityGroupRow[]> {
    return this.withTimeout((tx) => {
      const dimension = OBS_DIMENSION_SQL[query.entity];
      const sortExpr = OBS_SORT_SQL[query.sort];
      const where = this.where(query.scope, this.entitySearch(query.entity, query.search));
      const direction = query.descending ? Prisma.sql`DESC` : Prisma.sql`ASC`;
      return tx.$queryRaw<ObservabilityGroupRow[]>`
        SELECT * FROM (
          SELECT ${dimension.key} AS group_key, ${dimension.extras}, ${OBS_SUMS_SQL},
            (${sortExpr})::text AS sort_val,
            COUNT(*) OVER ()::int AS total_groups
          FROM ${OBS_FROM_SQL} WHERE ${where}
          GROUP BY ${dimension.groupBy}
        ) t
        ORDER BY t.sort_val::numeric ${direction}, t.group_key ${direction}
        LIMIT ${query.limit} OFFSET ${query.offset}`;
    });
  }

  /** Group count for a page past the end, where the window total is not available. */
  async countGroups(scope: ObservabilityScope, target: ObservabilityGroupTarget): Promise<number> {
    const dimension = OBS_DIMENSION_SQL[target.entity];
    const where = this.where(scope, this.entitySearch(target.entity, target.search));
    const rows = await this.withTimeout(
      (tx) =>
        tx.$queryRaw<Array<{ total: number }>>`
      SELECT COUNT(*)::int AS total FROM (
        SELECT 1 FROM ${OBS_FROM_SQL}
        WHERE ${where}
        GROUP BY ${dimension.groupBy}
      ) g`,
    );
    return rows[0]?.total ?? 0;
  }

  /** The export read: the page query from offset 0 with the export cap as its limit. */
  async entityExport(query: ObservabilityEntityPageQuery): Promise<ObservabilityGroupRow[]> {
    return this.entityPage({ ...query, offset: 0 });
  }

  /** Buckets are bounded by the range cap: at most 168 hourly or 90 daily rows. */
  async series(scope: ObservabilityScope, hourly: boolean): Promise<ObservabilityBucketRow[]> {
    const trunc = hourly ? Prisma.sql`'hour'` : Prisma.sql`'day'`;
    return this.withTimeout(
      (tx) =>
        tx.$queryRaw<ObservabilityBucketRow[]>`
      SELECT date_trunc(${trunc}, w.created_at) AS bucket_start,
        COUNT(DISTINCT w.user_id)::int AS active_users, ${OBS_SUMS_SQL}
      FROM ${OBS_FROM_SQL} WHERE ${this.where(scope)}
      GROUP BY 1 ORDER BY 1 ASC`,
    );
  }

  /**
   * Active users and users whose first ever request falls inside the window.
   * First seen is ONE grouped read over just the active users' rows, not a
   * NOT EXISTS probe per ledger row.
   */
  async people(scope: ObservabilityScope): Promise<ObservabilityPeopleRow | undefined> {
    const rows = await this.withTimeout(
      (tx) =>
        tx.$queryRaw<ObservabilityPeopleRow[]>`
      WITH active AS (
        SELECT w.user_id FROM ${OBS_FROM_SQL} WHERE ${this.where(scope)} GROUP BY w.user_id
      )
      SELECT COUNT(*)::int AS active_users,
        COUNT(*) FILTER (WHERE fs.first_seen_at >= ${scope.from})::int AS first_time_users
      FROM active a
      JOIN (
        SELECT p.user_id, MIN(p.created_at) AS first_seen_at
        FROM weighted_usage_records p
        WHERE p.user_id IN (SELECT user_id FROM active)
        GROUP BY p.user_id
      ) fs ON fs.user_id = a.user_id`,
    );
    return rows[0];
  }

  /** Accounts created in the window. Deliberately ignores every usage filter. */
  async newSignups(from: Date, to: Date): Promise<number> {
    const rows = await this.withTimeout(
      (tx) =>
        tx.$queryRaw<Array<{ total: number }>>`
      SELECT COUNT(*)::int AS total FROM users WHERE created_at >= ${from} AND created_at < ${to}`,
    );
    return rows[0]?.total ?? 0;
  }

  async signupsSeries(from: Date, to: Date, hourly: boolean): Promise<ObservabilitySignupRow[]> {
    const trunc = hourly ? Prisma.sql`'hour'` : Prisma.sql`'day'`;
    return this.withTimeout(
      (tx) =>
        tx.$queryRaw<ObservabilitySignupRow[]>`
      SELECT date_trunc(${trunc}, created_at) AS bucket_start, COUNT(*)::int AS total
      FROM users WHERE created_at >= ${from} AND created_at < ${to}
      GROUP BY 1 ORDER BY 1 ASC`,
    );
  }

  /** Distinct providers, models, plans and workflows in the window, so each "View all N" has a number. */
  async counts(scope: ObservabilityScope): Promise<ObservabilityCountsRow | undefined> {
    const rows = await this.withTimeout(
      (tx) =>
        tx.$queryRaw<ObservabilityCountsRow[]>`
      SELECT COUNT(DISTINCT k.provider_key)::int AS providers,
        COUNT(DISTINCT k.provider_key || '/' || w.model)::int AS models,
        COUNT(DISTINCT ${OBS_PLAN_KEY_SQL})::int AS plans,
        COUNT(DISTINCT k.workflow_key)::int AS workflows
      FROM ${OBS_FROM_SQL} WHERE ${this.where(scope)}`,
    );
    return rows[0];
  }

  /** Created-at is stored as a UTC timestamp, so EXTRACT needs no zone conversion. */
  async hourOfDay(scope: ObservabilityScope): Promise<ObservabilityActivityRow[]> {
    return this.withTimeout(
      (tx) =>
        tx.$queryRaw<ObservabilityActivityRow[]>`
      SELECT EXTRACT(HOUR FROM w.created_at)::int AS bucket, COUNT(*)::int AS requests,
        COALESCE(SUM(${ROW_COST_SQL}), 0)::text AS cost_micro_usd
      FROM ${OBS_FROM_SQL} WHERE ${this.where(scope)}
      GROUP BY 1 ORDER BY 1 ASC`,
    );
  }

  async dayOfWeek(scope: ObservabilityScope): Promise<ObservabilityActivityRow[]> {
    return this.withTimeout(
      (tx) =>
        tx.$queryRaw<ObservabilityActivityRow[]>`
      SELECT EXTRACT(ISODOW FROM w.created_at)::int AS bucket, COUNT(*)::int AS requests,
        COALESCE(SUM(${ROW_COST_SQL}), 0)::text AS cost_micro_usd
      FROM ${OBS_FROM_SQL} WHERE ${this.where(scope)}
      GROUP BY 1 ORDER BY 1 ASC`,
    );
  }

  async billingSplit(scope: ObservabilityScope): Promise<ObservabilityBillingRow[]> {
    return this.withTimeout(
      (tx) =>
        tx.$queryRaw<ObservabilityBillingRow[]>`
      SELECT ${ROW_BILLING_KIND_SQL} AS billing, COUNT(*)::int AS requests,
        COALESCE(SUM(${ROW_COST_SQL}), 0)::text AS cost_micro_usd
      FROM ${OBS_FROM_SQL} WHERE ${this.where(scope)}
      GROUP BY 1 ORDER BY 2 DESC`,
    );
  }

  /**
   * Settled vs refunded holds and reserve-to-settle time, over ALL states
   * (the only queries that look at RELEASED rows). With `keys`, one row per
   * listed group; with `entity` and no keys, the groups with the most refunded
   * holds, `limit` of them; with neither, one overall row. The counts read every
   * row; the settle TIMES skip legacy rows (`OBS_SETTLED_SQL`).
   */
  async health(
    scope: ObservabilityScope,
    grouping: { entity: ObservabilityEntity; keys: string[] | null; limit: number } | null,
  ): Promise<ObservabilityHealthRow[]> {
    const dimension = grouping === null ? null : OBS_DIMENSION_SQL[grouping.entity];
    const keys = grouping?.keys ?? null;
    const keyFilter =
      dimension === null || keys === null
        ? null
        : Prisma.sql`${dimension.key} = ANY(${keys}::text[])`;
    const where = this.where(scope, keyFilter, true);
    const groupSelect = dimension === null ? Prisma.sql`NULL::text` : dimension.key;
    const groupBy = dimension === null ? Prisma.empty : Prisma.sql`GROUP BY ${dimension.groupBy}`;
    const order =
      grouping === null
        ? Prisma.empty
        : Prisma.sql`ORDER BY COUNT(*) FILTER (WHERE w.state = 'RELEASED') DESC, 1 ASC LIMIT ${grouping.limit}`;
    return this.withTimeout(
      (tx) =>
        tx.$queryRaw<ObservabilityHealthRow[]>`
        SELECT ${groupSelect} AS group_key,
          COUNT(*) FILTER (WHERE w.state = 'FINALIZED')::int AS finalized,
          COUNT(*) FILTER (WHERE w.state = 'RELEASED')::int AS released,
          COUNT(*) FILTER (WHERE w.state = 'RESERVED')::int AS in_flight,
          COUNT(*) FILTER (WHERE w.state = 'RESERVED'
            AND w.created_at < ${OBS_STALE_RESERVED_SQL})::int AS stale_reserved,
          AVG(d.ms) FILTER (WHERE ${OBS_SETTLED_SQL}) AS avg_ms,
          percentile_cont(0.5) WITHIN GROUP (ORDER BY d.ms) FILTER (WHERE ${OBS_SETTLED_SQL}) AS p50_ms,
          percentile_cont(0.95) WITHIN GROUP (ORDER BY d.ms) FILTER (WHERE ${OBS_SETTLED_SQL}) AS p95_ms
        FROM ${OBS_FROM_SQL}
        CROSS JOIN LATERAL (
          SELECT (EXTRACT(EPOCH FROM (w.finalized_at - w.created_at)) * 1000)::double precision AS ms
        ) d
        WHERE ${where}
        ${groupBy}
        ${order}`,
    );
  }

  async providerOptions(scope: ObservabilityScope): Promise<ExplorerOptionRow[]> {
    return this.withTimeout(
      (tx) =>
        tx.$queryRaw<ExplorerOptionRow[]>`
      SELECT k.provider_key AS value FROM ${OBS_FROM_SQL} WHERE ${this.where(scope)}
      GROUP BY k.provider_key ORDER BY COUNT(*) DESC LIMIT ${OBS_FILTER_OPTIONS_LIMIT}`,
    );
  }

  async modelOptions(scope: ObservabilityScope): Promise<ExplorerOptionRow[]> {
    return this.withTimeout(
      (tx) =>
        tx.$queryRaw<ExplorerOptionRow[]>`
      SELECT w.model AS value FROM ${OBS_FROM_SQL} WHERE ${this.where(scope)}
      GROUP BY w.model ORDER BY COUNT(*) DESC LIMIT ${OBS_FILTER_OPTIONS_LIMIT}`,
    );
  }

  async workflowOptions(scope: ObservabilityScope): Promise<ExplorerOptionRow[]> {
    return this.withTimeout(
      (tx) =>
        tx.$queryRaw<ExplorerOptionRow[]>`
      SELECT k.workflow_key AS value FROM ${OBS_FROM_SQL} WHERE ${this.where(scope)}
      GROUP BY k.workflow_key ORDER BY COUNT(*) DESC LIMIT ${OBS_FILTER_OPTIONS_LIMIT}`,
    );
  }

  async planOptions(): Promise<ObservabilityPlanOptionRow[]> {
    return this.prisma.plan.findMany({
      select: { id: true, name: true },
      orderBy: { displayOrder: 'asc' },
      take: OBS_PLAN_OPTIONS_LIMIT,
    });
  }

  private async withTimeout<T>(run: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
    return this.prisma.$transaction(
      async (tx) => {
        await tx.$executeRaw(
          Prisma.sql`SET LOCAL statement_timeout = ${OBS_STATEMENT_TIMEOUT_SQL}`,
        );
        return run(tx);
      },
      { timeout: OBS_TRANSACTION_TIMEOUT_MS, maxWait: OBS_TRANSACTION_MAX_WAIT_MS },
    );
  }

  private likePattern(search: string): string {
    return `%${search.replace(LIKE_ESCAPE_PATTERN, '\\$&')}%`;
  }

  private entitySearch(entity: ObservabilityEntity, search: string | null): Prisma.Sql | null {
    if (search === null) {
      return null;
    }
    const pattern = this.likePattern(search);
    switch (entity) {
      case ObservabilityEntity.USER:
        return Prisma.sql`(u.email ILIKE ${pattern} OR u.username ILIKE ${pattern} OR w.user_id = ${search})`;
      case ObservabilityEntity.PROVIDER:
        return Prisma.sql`(w.provider ILIKE ${pattern} OR k.provider_key ILIKE ${pattern})`;
      case ObservabilityEntity.MODEL:
        return Prisma.sql`(w.model ILIKE ${pattern} OR w.provider ILIKE ${pattern})`;
      case ObservabilityEntity.PLAN:
        return Prisma.sql`(pl.name ILIKE ${pattern} OR pl.slug ILIKE ${pattern})`;
      case ObservabilityEntity.WORKFLOW:
        return Prisma.sql`k.workflow_key ILIKE ${pattern}`;
    }
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

  /** `W`, or `W_all` (no state predicate) when `includeReleased` is set for the health queries. */
  private where(
    scope: ObservabilityScope,
    extra: Prisma.Sql | null = null,
    includeReleased = false,
  ): Prisma.Sql {
    const parts: Prisma.Sql[] = [
      Prisma.sql`w.created_at >= ${scope.from} AND w.created_at < ${scope.to}`,
    ];
    if (!includeReleased) {
      parts.push(Prisma.sql`w.state <> 'RELEASED'`);
    }
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
    if (scope.plan !== null) {
      parts.push(
        scope.plan === OBS_NO_PLAN_KEY
          ? Prisma.sql`${OBS_PLAN_ID_SQL} IS NULL`
          : Prisma.sql`${OBS_PLAN_ID_SQL} = ${scope.plan}`,
      );
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
