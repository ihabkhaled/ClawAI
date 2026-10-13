import { Injectable } from '@nestjs/common';
import {
  type AdminObsDetail,
  type AdminObsFilterOptions,
  type AdminObsGrain,
  type AdminObsHealthReport,
  type AdminObsOverview,
  type AdminObsPage,
  type AdminObsUsersExport,
} from '@claw/shared-types';

import {
  OBS_DEFAULT_DAYS,
  OBS_DETAIL_MODELS_LIMIT,
  OBS_DETAIL_SPLIT_LIMIT,
  OBS_EXPORT_MAX_ROWS,
  OBS_HEALTH_PROVIDERS_LIMIT,
} from '../constants/admin-observability.constants';
import {
  type ObservabilityExportQueryDto,
  type ObservabilityListQueryDto,
  type ObservabilityModelDetailQueryDto,
  type ObservabilityProviderDetailQueryDto,
  type ObservabilityScopeQueryDto,
  type ObservabilityUsersQueryDto,
} from '../dto/admin-observability.dto';
import {
  ObservabilityEmailMode,
  ObservabilityEntity,
  ObservabilitySortField,
} from '../enums/usage-cost-kind.enum';
import { AdminObservabilityRepository } from '../repositories/admin-observability.repository';
import {
  type ObservabilityDetailSplits,
  type ObservabilityGroupRow,
  type ObservabilityHealthRow,
  type ObservabilityOverviewBreakdown,
  type ObservabilityOverviewPeriods,
  type ObservabilityResolvedScope,
  type ObservabilityScope,
  type ObservabilityScopeInput,
} from '../types/admin-observability.types';
import { type AdminUsageRange } from '../types/admin-usage-analytics.types';
import { type AdminUsageAuditPayload } from '../types/admin-usage-explorer.types';
import {
  emptyDetailRow,
  shareBaseOf,
  toBillingSplit,
  toDayOfWeek,
  toDetailBlocks,
  toEntityRow,
  toFilledSeries,
  toFilledSignups,
  toHourOfDay,
  toObsCounts,
  toObsHealth,
  toObsStats,
  toOverviewDeltas,
} from '../utilities/admin-observability-mapper.utility';
import { normalizeProviderKey, providerLabel } from '../utilities/provider-label.utility';
import { resolveUsageRange } from '../utilities/usage-range.utility';
import { AdminUsageAuditService } from './admin-usage-audit.service';

/**
 * Operator-facing observability pages: every list is paginated, sortable,
 * searchable and covers ALL matching rows, never a top-N. Read-only and
 * reservation-free.
 *
 * The users list returns full emails (admin role plus `ADMIN_USAGE_VIEW`), so
 * EVERY users list request (any page, any search) and every export leave an
 * audit event. Every other block masks the address.
 *
 * Every read holds a pooled connection under a statement timeout, so a page
 * fans its reads out in batches of at most six, never all at once.
 */
@Injectable()
export class AdminObservabilityService {
  constructor(
    private readonly repository: AdminObservabilityRepository,
    private readonly audit: AdminUsageAuditService,
  ) {}

  async overview(query: ObservabilityScopeQueryDto): Promise<AdminObsOverview> {
    const { scope, range, now } = this.resolve(query);
    const span = range.to.getTime() - range.from.getTime();
    const previousScope: ObservabilityScope = {
      ...scope,
      from: new Date(range.from.getTime() - span),
      to: range.from,
    };
    const periods = await this.readOverviewPeriods(scope, previousScope, range);
    const breakdown = await this.readOverviewBreakdown(scope, range.grain === 'HOUR');
    const { totals, previousTotals, people, previousPeople } = periods;
    return {
      ...this.head(range, now),
      previousFrom: previousScope.from.toISOString(),
      previousTo: previousScope.to.toISOString(),
      totals: toObsStats(totals, shareBaseOf(totals)),
      previousTotals: toObsStats(previousTotals, shareBaseOf(previousTotals)),
      deltas: toOverviewDeltas(
        { totals, people },
        { totals: previousTotals, people: previousPeople },
      ),
      activeUsers: people?.active_users ?? 0,
      firstTimeUsers: people?.first_time_users ?? 0,
      newSignups: periods.newSignups,
      signupsSeries: toFilledSignups(periods.signups, range),
      counts: toObsCounts(breakdown.counts),
      health: toObsHealth(breakdown.health[0]),
      series: toFilledSeries(breakdown.series, range),
      hourOfDay: toHourOfDay(breakdown.hourOfDay),
      dayOfWeek: toDayOfWeek(breakdown.dayOfWeek),
      billingSplit: toBillingSplit(breakdown.billing),
    };
  }

  /** Every user with usage in the window, one page. Every request is audited. */
  async listUsers(query: ObservabilityUsersQueryDto, actorUserId: string): Promise<AdminObsPage> {
    const result = await this.list(ObservabilityEntity.USER, query, ObservabilityEmailMode.FULL);
    await this.audit.recordListed(actorUserId, {
      ...this.auditFilters(result.range, query),
      page: query.page,
      limit: query.limit,
      hasSearch: query.search !== undefined && query.search.length > 0,
      rows: result.page.items.length,
    });
    return result.page;
  }

  /** Every matching user up to the export cap. Audited. */
  async exportUsers(
    query: ObservabilityExportQueryDto,
    actorUserId: string,
  ): Promise<AdminObsUsersExport> {
    const { scope, range, now } = this.resolve(query);
    const [rows, totals] = await Promise.all([
      this.repository.entityExport({
        scope,
        entity: ObservabilityEntity.USER,
        search: query.search ?? null,
        sort: query.sort,
        descending: query.order === 'desc',
        limit: OBS_EXPORT_MAX_ROWS + 1,
        offset: 0,
      }),
      this.repository.totals(scope),
    ]);
    const kept = rows.slice(0, OBS_EXPORT_MAX_ROWS);
    const base = shareBaseOf(totals);
    await this.audit.recordExported(actorUserId, {
      ...this.auditFilters(range, query),
      hasSearch: query.search !== undefined && query.search.length > 0,
      rows: kept.length,
    });
    return {
      from: range.from.toISOString(),
      to: range.to.toISOString(),
      generatedAt: now.toISOString(),
      items: kept.map((row) =>
        toEntityRow(row, ObservabilityEntity.USER, base, ObservabilityEmailMode.FULL, null),
      ),
      truncated: rows.length > OBS_EXPORT_MAX_ROWS,
      total: rows[0]?.total_groups ?? 0,
    };
  }

  async listProviders(query: ObservabilityListQueryDto): Promise<AdminObsPage> {
    return (await this.list(ObservabilityEntity.PROVIDER, query, ObservabilityEmailMode.MASKED))
      .page;
  }

  async listModels(query: ObservabilityListQueryDto): Promise<AdminObsPage> {
    return (await this.list(ObservabilityEntity.MODEL, query, ObservabilityEmailMode.MASKED)).page;
  }

  async listPlans(query: ObservabilityListQueryDto): Promise<AdminObsPage> {
    return (await this.list(ObservabilityEntity.PLAN, query, ObservabilityEmailMode.MASKED)).page;
  }

  async listWorkflows(query: ObservabilityListQueryDto): Promise<AdminObsPage> {
    return (await this.list(ObservabilityEntity.WORKFLOW, query, ObservabilityEmailMode.MASKED))
      .page;
  }

  async providerDetail(
    provider: string,
    query: ObservabilityProviderDetailQueryDto,
  ): Promise<AdminObsDetail> {
    const { scope, range, now } = this.resolve({ ...query, provider });
    return this.detail(scope, range, now, ObservabilityEntity.PROVIDER);
  }

  async modelDetail(query: ObservabilityModelDetailQueryDto): Promise<AdminObsDetail> {
    const { scope, range, now } = this.resolve(query);
    return this.detail(scope, range, now, ObservabilityEntity.MODEL);
  }

  /** Filter choices for the shared bar: the window only, so a chosen filter never empties its own list. */
  async filterOptions(query: ObservabilityScopeQueryDto): Promise<AdminObsFilterOptions> {
    const { scope } = this.resolve({
      hours: query.hours,
      from: query.from,
      to: query.to,
    });
    const [providers, models, workflows, plans] = await Promise.all([
      this.repository.providerOptions(scope),
      this.repository.modelOptions(scope),
      this.repository.workflowOptions(scope),
      this.repository.planOptions(),
    ]);
    return {
      providers: providers.map((row) => ({ value: row.value, label: providerLabel(row.value) })),
      models: models.map((row) => row.value),
      workflows: workflows.map((row) => row.value),
      plans: plans.map((row) => ({ value: row.id, label: row.name })),
    };
  }

  /** Refunded holds overall and per provider: the auth half of the failures page. */
  async healthReport(query: ObservabilityScopeQueryDto): Promise<AdminObsHealthReport> {
    const { scope, range, now } = this.resolve(query);
    const [overall, byProvider] = await Promise.all([
      this.repository.health(scope, null),
      this.repository.health(scope, {
        entity: ObservabilityEntity.PROVIDER,
        keys: null,
        limit: OBS_HEALTH_PROVIDERS_LIMIT,
      }),
    ]);
    return {
      from: range.from.toISOString(),
      to: range.to.toISOString(),
      generatedAt: now.toISOString(),
      overall: toObsHealth(overall[0]),
      byProvider: byProvider.map((row) => ({
        key: row.group_key ?? '',
        label: providerLabel(row.group_key),
        health: toObsHealth(row),
      })),
    };
  }

  private async list(
    entity: ObservabilityEntity,
    query: ObservabilityListQueryDto,
    emailMode: ObservabilityEmailMode,
  ): Promise<{ page: AdminObsPage; range: AdminUsageRange }> {
    const { scope, range, now } = this.resolve(query);
    const search = query.search ?? null;
    const [rows, totals] = await Promise.all([
      this.repository.entityPage({
        scope,
        entity,
        search,
        sort: query.sort,
        descending: query.order === 'desc',
        limit: query.limit,
        offset: (query.page - 1) * query.limit,
      }),
      this.repository.totals(scope),
    ]);
    const total =
      rows[0]?.total_groups ??
      (query.page > 1 ? await this.repository.countGroups(scope, { entity, search }) : 0);
    const health = await this.healthByKey(scope, entity, rows);
    const base = shareBaseOf(totals);
    return {
      range,
      page: {
        ...this.head(range, now),
        sort: query.sort,
        order: query.order,
        page: query.page,
        limit: query.limit,
        total,
        pageCount: Math.ceil(total / query.limit),
        items: rows.map((row) =>
          toEntityRow(row, entity, base, emailMode, health.get(row.group_key) ?? null),
        ),
        totals: toObsStats(totals, base),
      },
    };
  }

  private async healthByKey(
    scope: ObservabilityScope,
    entity: ObservabilityEntity,
    rows: ObservabilityGroupRow[],
  ): Promise<Map<string, ObservabilityHealthRow>> {
    if (rows.length === 0) {
      return new Map();
    }
    const health = await this.repository.health(scope, {
      entity,
      keys: rows.map((row) => row.group_key),
      limit: rows.length,
    });
    return new Map(health.map((row) => [row.group_key ?? '', row]));
  }

  /**
   * Provider or model detail. The header share is against the platform total
   * (the provider / model filter dropped); each split block is a share of the
   * entity itself. Two batches of six reads.
   */
  private async detail(
    scope: ObservabilityScope,
    range: AdminUsageRange,
    now: Date,
    entity: ObservabilityEntity.PROVIDER | ObservabilityEntity.MODEL,
  ): Promise<AdminObsDetail> {
    const platformScope: ObservabilityScope = { ...scope, provider: null, model: null };
    const [header, platform, own, health, series, hourOfDay] = await Promise.all([
      this.split(scope, entity, 0),
      this.repository.totals(platformScope),
      this.repository.totals(scope),
      this.repository.health(scope, null),
      this.repository.series(scope, range.grain === 'HOUR'),
      this.repository.hourOfDay(scope),
    ]);
    const splits = await this.readDetailSplits(scope, entity);
    const ownBase = shareBaseOf(own);
    const headerRow = header[0] ?? emptyDetailRow(entity, scope.provider, scope.model);
    return {
      ...this.head(range, now),
      entity: toEntityRow(
        headerRow,
        entity,
        shareBaseOf(platform),
        ObservabilityEmailMode.MASKED,
        health[0] ?? null,
      ),
      series: toFilledSeries(series, range),
      hourOfDay: toHourOfDay(hourOfDay),
      billingSplit: toBillingSplit(splits.billing),
      ...toDetailBlocks(splits, ownBase),
    };
  }

  /** The top rows of one entity inside the scope, by cost; one extra row shows the block is cut. */
  private split(
    scope: ObservabilityScope,
    target: ObservabilityEntity,
    limit: number,
  ): Promise<ObservabilityGroupRow[]> {
    return this.repository.entityPage({
      scope,
      entity: target,
      search: null,
      sort: ObservabilitySortField.COST,
      descending: true,
      limit: limit + 1,
      offset: 0,
    });
  }

  /** Detail batch two (six reads): the billing split and the five breakdown blocks. */
  private async readDetailSplits(
    scope: ObservabilityScope,
    entity: ObservabilityEntity.PROVIDER | ObservabilityEntity.MODEL,
  ): Promise<ObservabilityDetailSplits> {
    const isProvider = entity === ObservabilityEntity.PROVIDER;
    const [billing, models, providers, users, plans, workflows] = await Promise.all([
      this.repository.billingSplit(scope),
      isProvider
        ? this.split(scope, ObservabilityEntity.MODEL, OBS_DETAIL_MODELS_LIMIT)
        : Promise.resolve([]),
      isProvider
        ? Promise.resolve([])
        : this.split(scope, ObservabilityEntity.PROVIDER, OBS_DETAIL_SPLIT_LIMIT),
      this.split(scope, ObservabilityEntity.USER, OBS_DETAIL_SPLIT_LIMIT),
      this.split(scope, ObservabilityEntity.PLAN, OBS_DETAIL_SPLIT_LIMIT),
      this.split(scope, ObservabilityEntity.WORKFLOW, OBS_DETAIL_SPLIT_LIMIT),
    ]);
    return { billing, models, providers, users, plans, workflows };
  }

  /** Overview batch one (six reads): both periods' totals and people, plus the signups. */
  private async readOverviewPeriods(
    scope: ObservabilityScope,
    previousScope: ObservabilityScope,
    range: AdminUsageRange,
  ): Promise<ObservabilityOverviewPeriods> {
    const [totals, previousTotals, people, previousPeople, newSignups, signups] = await Promise.all(
      [
        this.repository.totals(scope),
        this.repository.totals(previousScope),
        this.repository.people(scope),
        this.repository.people(previousScope),
        this.repository.newSignups(range.from, range.to),
        this.repository.signupsSeries(range.from, range.to, range.grain === 'HOUR'),
      ],
    );
    return { totals, previousTotals, people, previousPeople, newSignups, signups };
  }

  /** Overview batch two (six reads): distinct counts, health, series and the activity splits. */
  private async readOverviewBreakdown(
    scope: ObservabilityScope,
    hourly: boolean,
  ): Promise<ObservabilityOverviewBreakdown> {
    const [counts, health, series, hourOfDay, dayOfWeek, billing] = await Promise.all([
      this.repository.counts(scope),
      this.repository.health(scope, null),
      this.repository.series(scope, hourly),
      this.repository.hourOfDay(scope),
      this.repository.dayOfWeek(scope),
      this.repository.billingSplit(scope),
    ]);
    return { counts, health, series, hourOfDay, dayOfWeek, billing };
  }

  private resolve(input: ObservabilityScopeInput): ObservabilityResolvedScope {
    const now = new Date();
    const range = resolveUsageRange(input, now, OBS_DEFAULT_DAYS);
    return {
      now,
      range,
      scope: {
        userId: input.userId ?? null,
        from: range.from,
        to: range.to,
        provider: input.provider === undefined ? null : normalizeProviderKey(input.provider),
        model: input.model ?? null,
        workflow: input.workflow ?? null,
        billing: input.billing ?? null,
        plan: input.plan ?? null,
      },
    };
  }

  private head(
    range: AdminUsageRange,
    now: Date,
  ): { from: string; to: string; generatedAt: string; grain: AdminObsGrain } {
    return {
      from: range.from.toISOString(),
      to: range.to.toISOString(),
      generatedAt: now.toISOString(),
      grain: range.grain,
    };
  }

  /** Filters for the audit trail: ids and settings only. Never an email. */
  private auditFilters(
    range: AdminUsageRange,
    query: ObservabilityScopeInput,
  ): AdminUsageAuditPayload['filters'] {
    return {
      from: range.from.toISOString(),
      to: range.to.toISOString(),
      provider: query.provider ?? null,
      model: query.model ?? null,
      workflow: query.workflow ?? null,
      billing: query.billing ?? null,
      plan: query.plan ?? null,
    };
  }
}
