import { Injectable, NotFoundException } from '@nestjs/common';

import {
  EXPLORER_BREAKDOWN_LIMIT,
  EXPLORER_DEFAULT_DAYS,
  EXPLORER_EXPORT_MAX_ROWS,
  EXPLORER_EXPORT_PAGE_SIZE,
  EXPLORER_HEAVIEST_LIMIT,
} from '../constants/admin-usage-explorer.constants';
import {
  type ExplorerLeaderboardQueryDto,
  type ExplorerTimeseriesQueryDto,
  type ExplorerUserDetailQueryDto,
  type ExplorerUserRequestsQueryDto,
  type ExplorerUsersExportQueryDto,
  type ExplorerUsersQueryDto,
} from '../dto/admin-usage-explorer.dto';
import {
  UsageLeaderboardDimension,
  UsageRequestSortField,
  UsageSortField,
} from '../enums/usage-cost-kind.enum';
import { AdminUsageExplorerRepository } from '../repositories/admin-usage-explorer.repository';
import {
  type AdminUsageAuditPayload,
  type AdminUsageFilterOptions,
  type AdminUsageLeaderboardPage,
  type AdminUsageRequestsPage,
  type AdminUsageTimeseries,
  type AdminUsageUserRow,
  type AdminUsageUsersPage,
  type AdminUserConsumptionDetail,
  type ExplorerCursor,
  type ExplorerGroupRow,
  type ExplorerResolvedScope,
  type ExplorerScope,
  type ExplorerScopeInput,
} from '../types/admin-usage-explorer.types';
import { type AdminUsageRange } from '../types/admin-usage-analytics.types';
import { resolveUsageRange } from '../utilities/usage-range.utility';
import { normalizeProviderKey, providerLabel } from '../utilities/provider-label.utility';
import { decodeCursor, encodeCursor } from '../utilities/usage-cursor.utility';
import {
  groupKey,
  requestKey,
  toGroupRow,
  toMetrics,
  toRequestRow,
  toSeriesPoint,
  toUserRow,
} from '../utilities/usage-explorer-mapper.utility';
import { AdminUsageAuditService } from './admin-usage-audit.service';

/**
 * Operator-facing usage explorer: paginated, searchable, filterable views over
 * the weighted-usage ledger. Read-only and reservation-free.
 *
 * Emails are returned in full here (admin role plus `ADMIN_USAGE_VIEW`), so
 * opening a user's view and exporting the list both leave an audit event.
 */
@Injectable()
export class AdminUsageExplorerService {
  constructor(
    private readonly repository: AdminUsageExplorerRepository,
    private readonly audit: AdminUsageAuditService,
  ) {}

  async listUsers(query: ExplorerUsersQueryDto, actorUserId: string): Promise<AdminUsageUsersPage> {
    const now = new Date();
    const { scope, range } = this.resolve(query, now, null);
    const search = query.search ?? null;
    const descending = query.order === 'desc';
    const [rows, matchedUsers] = await Promise.all([
      this.repository.groupPage({
        scope,
        dimension: UsageLeaderboardDimension.USER,
        search,
        sort: query.sort,
        descending,
        limit: query.limit + 1,
        cursor: decodeCursor(query.cursor),
      }),
      this.repository.distinctUsers(scope, search),
    ]);
    const page = this.slice(rows, query.limit, groupKey);
    await this.auditListed(actorUserId, range, query, page.items.length);
    return {
      ...this.pageHead(range, now, query.sort, query.order, query.limit),
      items: page.items.map(toUserRow),
      nextCursor: page.nextCursor,
      matchedUsers,
    };
  }

  /** Every matching user, up to the export cap. Audited. */
  async exportUsers(
    query: ExplorerUsersExportQueryDto,
    actorUserId: string,
  ): Promise<{ items: AdminUsageUserRow[]; truncated: boolean; from: string; to: string }> {
    const now = new Date();
    const { scope, range } = this.resolve(query, now, null);
    const items: AdminUsageUserRow[] = [];
    let cursor: ExplorerCursor | null = null;
    let truncated = false;
    while (items.length < EXPLORER_EXPORT_MAX_ROWS) {
      const rows = await this.repository.groupPage({
        scope,
        dimension: UsageLeaderboardDimension.USER,
        search: query.search ?? null,
        sort: UsageSortField.COST,
        descending: query.order === 'desc',
        limit: EXPLORER_EXPORT_PAGE_SIZE + 1,
        cursor,
      });
      const page = this.slice(rows, EXPLORER_EXPORT_PAGE_SIZE, groupKey);
      items.push(...page.items.map(toUserRow));
      if (page.nextCursor === null) {
        break;
      }
      cursor = decodeCursor(page.nextCursor);
      truncated = items.length >= EXPLORER_EXPORT_MAX_ROWS;
    }
    await this.audit.recordExported(actorUserId, {
      ...this.auditFilters(range, query),
      search: query.search ?? null,
      rows: items.length,
    });
    return {
      items: items.slice(0, EXPLORER_EXPORT_MAX_ROWS),
      truncated,
      from: range.from.toISOString(),
      to: range.to.toISOString(),
    };
  }

  async leaderboard(
    query: ExplorerLeaderboardQueryDto,
    actorUserId: string,
  ): Promise<AdminUsageLeaderboardPage> {
    const now = new Date();
    const { scope, range } = this.resolve(query, now, query.userId ?? null);
    const rows = await this.repository.groupPage({
      scope,
      dimension: query.dimension,
      search: query.search ?? null,
      sort: query.sort,
      descending: query.order === 'desc',
      limit: query.limit + 1,
      cursor: decodeCursor(query.cursor),
    });
    const page = this.slice(rows, query.limit, groupKey);
    if (query.dimension === UsageLeaderboardDimension.USER) {
      await this.auditListed(actorUserId, range, query, page.items.length);
    }
    return {
      ...this.pageHead(range, now, query.sort, query.order, query.limit),
      dimension: query.dimension,
      items: page.items.map((row) => toGroupRow(row, query.dimension)),
      nextCursor: page.nextCursor,
    };
  }

  async timeseries(query: ExplorerTimeseriesQueryDto): Promise<AdminUsageTimeseries> {
    const now = new Date();
    const { scope, range } = this.resolve(query, now, query.userId ?? null);
    const [totals, series] = await Promise.all([
      this.repository.totals(scope),
      this.repository.series(scope, range.grain === 'HOUR'),
    ]);
    return {
      from: range.from.toISOString(),
      to: range.to.toISOString(),
      generatedAt: now.toISOString(),
      grain: range.grain,
      totals: toMetrics(totals),
      series: series.map(toSeriesPoint),
    };
  }

  /** A user's whole consumption under the chosen filters. Audited. */
  async userDetail(
    userId: string,
    query: ExplorerUserDetailQueryDto,
    actorUserId: string,
  ): Promise<AdminUserConsumptionDetail> {
    const now = new Date();
    const { scope, range } = this.resolve(query, now, userId);
    const identity = await this.repository.findUserIdentity(userId);
    if (identity === null) {
      throw new NotFoundException({ message: 'user not found', code: 'USER_NOT_FOUND' });
    }
    await this.audit.recordViewed(actorUserId, userId, this.auditFilters(range, query));

    const optionScope: ExplorerScope = {
      ...scope,
      provider: null,
      model: null,
      workflow: null,
      billing: null,
    };
    const breakdown = (dimension: UsageLeaderboardDimension): Promise<ExplorerGroupRow[]> =>
      this.repository.groupPage({
        scope,
        dimension,
        search: null,
        sort: UsageSortField.COST,
        descending: true,
        limit: EXPLORER_BREAKDOWN_LIMIT + 1,
        cursor: null,
      });
    const [totals, models, providers, workflows, series, heaviest, options] = await Promise.all([
      this.repository.totals(scope),
      breakdown(UsageLeaderboardDimension.MODEL),
      breakdown(UsageLeaderboardDimension.PROVIDER),
      breakdown(UsageLeaderboardDimension.WORKFLOW),
      this.repository.series(scope, range.grain === 'HOUR'),
      this.repository.requestPage({
        scope,
        search: null,
        sort: UsageRequestSortField.TOKENS,
        descending: true,
        limit: EXPLORER_HEAVIEST_LIMIT,
        cursor: null,
      }),
      this.filterOptions(optionScope),
    ]);

    const cut = (rows: ExplorerGroupRow[], dimension: UsageLeaderboardDimension) =>
      rows.slice(0, EXPLORER_BREAKDOWN_LIMIT).map((row) => toGroupRow(row, dimension));
    return {
      user: {
        userId: identity.id,
        email: identity.email,
        username: identity.username,
        role: identity.role,
        status: identity.status,
      },
      from: range.from.toISOString(),
      to: range.to.toISOString(),
      generatedAt: now.toISOString(),
      grain: range.grain,
      filters: {
        provider: scope.provider,
        model: scope.model,
        workflow: scope.workflow,
        billing: scope.billing,
      },
      totals: toMetrics(totals),
      models: cut(models, UsageLeaderboardDimension.MODEL),
      providers: cut(providers, UsageLeaderboardDimension.PROVIDER),
      workflows: cut(workflows, UsageLeaderboardDimension.WORKFLOW),
      breakdownTruncated: [models, providers, workflows].some(
        (rows) => rows.length > EXPLORER_BREAKDOWN_LIMIT,
      ),
      series: series.map(toSeriesPoint),
      heaviestRequests: heaviest.map(toRequestRow),
      filterOptions: options,
    };
  }

  /** Paged, searchable request list for one user. The first page counts as an audited open. */
  async userRequests(
    userId: string,
    query: ExplorerUserRequestsQueryDto,
    actorUserId: string,
  ): Promise<AdminUsageRequestsPage> {
    const now = new Date();
    const { scope, range } = this.resolve(query, now, userId);
    if (query.cursor === undefined) {
      await this.audit.recordViewed(actorUserId, userId, this.auditFilters(range, query));
    }
    const rows = await this.repository.requestPage({
      scope,
      search: query.search ?? null,
      sort: query.sort,
      descending: query.order === 'desc',
      limit: query.limit + 1,
      cursor: decodeCursor(query.cursor),
    });
    const page = this.slice(rows, query.limit, requestKey);
    return {
      ...this.pageHead(range, now, query.sort, query.order, query.limit),
      items: page.items.map(toRequestRow),
      nextCursor: page.nextCursor,
    };
  }

  private async filterOptions(scope: ExplorerScope): Promise<AdminUsageFilterOptions> {
    const [providers, models, workflows] = await Promise.all([
      this.repository.providerOptions(scope),
      this.repository.modelOptions(scope),
      this.repository.workflowOptions(scope),
    ]);
    return {
      providers: providers.map((row) => ({ value: row.value, label: providerLabel(row.value) })),
      models: models.map((row) => row.value),
      workflows: workflows.map((row) => row.value),
    };
  }

  private resolve(
    input: ExplorerScopeInput,
    now: Date,
    userId: string | null,
  ): ExplorerResolvedScope {
    const range = resolveUsageRange(input, now, EXPLORER_DEFAULT_DAYS);
    return {
      range,
      scope: {
        userId,
        from: range.from,
        to: range.to,
        provider: input.provider === undefined ? null : normalizeProviderKey(input.provider),
        model: input.model ?? null,
        workflow: input.workflow ?? null,
        billing: input.billing ?? null,
      },
    };
  }

  private pageHead(range: AdminUsageRange, now: Date, sort: string, order: string, limit: number) {
    return {
      from: range.from.toISOString(),
      to: range.to.toISOString(),
      generatedAt: now.toISOString(),
      sort,
      order: order === 'asc' ? ('asc' as const) : ('desc' as const),
      limit,
    };
  }

  /** Drops the look-ahead row and turns it into the cursor for the next page. */
  private slice<T extends { sort_val: string }>(
    rows: T[],
    limit: number,
    keyOf: (row: T) => string,
  ): { items: T[]; nextCursor: string | null } {
    if (rows.length <= limit) {
      return { items: rows, nextCursor: null };
    }
    const items = rows.slice(0, limit);
    const last = items.at(-1);
    return {
      items,
      nextCursor: last === undefined ? null : encodeCursor(last.sort_val, keyOf(last)),
    };
  }

  /**
   * Audits the first page of any email-bearing list. Later cursor pages are the
   * same query, so they add no row. Never stores the search text (it may be an
   * email), only whether one was used.
   */
  private async auditListed(
    actorUserId: string,
    range: AdminUsageRange,
    query: ExplorerScopeInput & { cursor?: string | undefined; search?: string | undefined },
    returned: number,
  ): Promise<void> {
    if (query.cursor !== undefined) {
      return;
    }
    await this.audit.recordListed(actorUserId, {
      ...this.auditFilters(range, query),
      hasSearch: query.search !== undefined && query.search.length > 0,
      rows: returned,
    });
  }

  /** Filters for the audit trail: ids and settings only. Never an email. */
  private auditFilters(
    range: AdminUsageRange,
    query: ExplorerScopeInput,
  ): AdminUsageAuditPayload['filters'] {
    return {
      from: range.from.toISOString(),
      to: range.to.toISOString(),
      provider: query.provider ?? null,
      model: query.model ?? null,
      workflow: query.workflow ?? null,
      billing: query.billing ?? null,
    };
  }
}
