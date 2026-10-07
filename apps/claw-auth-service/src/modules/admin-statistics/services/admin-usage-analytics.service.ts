import { Injectable, Logger } from '@nestjs/common';
import {
  type AdminFreeAllowanceUsage,
  type AdminUsageAnalytics,
  type AdminUserUsageBreakdown,
} from '@claw/shared-types';

import { utcMonthKey } from '../../../common/utilities/period-key.utility';
import { CreditFreeAllowanceRepository } from '../../credit/repositories/credit-free-allowance.repository';
import { CreditFreeAllowanceService } from '../../credit/services/credit-free-allowance.service';
import {
  ADMIN_USAGE_OVERVIEW_DEFAULT_DAYS,
  ADMIN_USAGE_USER_DEFAULT_DAYS,
  ADMIN_USAGE_USER_MODELS_LIMIT,
} from '../constants/admin-usage-analytics.constants';
import {
  type AdminUsageAnalyticsQueryDto,
  type AdminUsageRangeQueryDto,
} from '../dto/admin-usage-analytics.dto';
import { AdminUsageAnalyticsRepository } from '../repositories/admin-usage-analytics.repository';
import { type UsageQueryScope } from '../types/admin-usage-analytics.types';
import { resolveUsageRange, utcDayStart } from '../utilities/usage-range.utility';
import { maskEmail, toCount, toTotals } from '../utilities/usage-row-mapper.utility';
import {
  toCreditConnector,
  toFreeAllowanceUsage,
  toModelLine,
  toToolLine,
  toWorkflowLine,
} from '../utilities/usage-view.utility';

/**
 * Operator-facing usage analytics over rows the auth-service already stores.
 *
 * Read-only and reservation-free: opening an admin panel never consumes the
 * inspected account's quota. Two views share one repository: a per-user
 * breakdown (models, tools, credit connectors, free allowance) and a
 * platform-wide overview (daily tokens, spend, models, top users, top tools).
 */
@Injectable()
export class AdminUsageAnalyticsService {
  private readonly logger = new Logger(AdminUsageAnalyticsService.name);

  constructor(
    private readonly repository: AdminUsageAnalyticsRepository,
    private readonly allowance: CreditFreeAllowanceService,
    private readonly counters: CreditFreeAllowanceRepository,
  ) {}

  async getUserBreakdown(
    userId: string,
    query: AdminUsageRangeQueryDto,
  ): Promise<AdminUserUsageBreakdown> {
    const now = new Date();
    const range = resolveUsageRange(query, now, ADMIN_USAGE_USER_DEFAULT_DAYS);
    const scope: UsageQueryScope = { userId, from: range.from, to: range.to };
    const page = ADMIN_USAGE_USER_MODELS_LIMIT;
    this.logger.debug(`getUserBreakdown: grain=${range.grain}`);

    const [totals, credit, modelRows, tools, workflows, freeAllowance] = await Promise.all([
      this.repository.totals(scope),
      this.repository.creditSums(scope),
      this.repository.byModel(scope, page + 1),
      this.repository.tools(scope, page),
      this.repository.byWorkflow(scope, page),
      this.readFreeAllowance(userId, now),
    ]);

    return {
      userId,
      from: range.from.toISOString(),
      to: range.to.toISOString(),
      generatedAt: now.toISOString(),
      totals: toTotals(totals),
      models: modelRows.slice(0, page).map(toModelLine),
      tools: tools.map(toToolLine),
      toolCallCount: toCount(totals?.tool_calls),
      workflows: workflows.map(toWorkflowLine),
      creditConnector: toCreditConnector(credit, freeAllowance),
      modelsTruncated: modelRows.length > page,
    };
  }

  async getOverview(query: AdminUsageAnalyticsQueryDto): Promise<AdminUsageAnalytics> {
    const now = new Date();
    const range = resolveUsageRange(query, now, ADMIN_USAGE_OVERVIEW_DEFAULT_DAYS);
    const userId = query.userId ?? null;
    const scope: UsageQueryScope = { userId, from: range.from, to: range.to };
    const todayScope: UsageQueryScope = { userId, from: utcDayStart(now), to: now };

    const [totals, today, activeUsers, series, modelRows, topUserRows, tools, workflows] =
      await Promise.all([
        this.repository.totals(scope),
        this.repository.totals(todayScope),
        this.repository.activeUsers(scope),
        this.repository.series(scope, range.grain),
        this.repository.byModel(scope, query.limit),
        userId === null ? this.repository.byUser(scope, query.limit) : Promise.resolve([]),
        this.repository.tools(scope, query.limit),
        this.repository.byWorkflow(scope, query.limit),
      ]);

    const emails = await this.repository.emailsFor(topUserRows.map((row) => row.user_id));

    return {
      from: range.from.toISOString(),
      to: range.to.toISOString(),
      generatedAt: now.toISOString(),
      grain: range.grain,
      userId,
      totals: toTotals(totals),
      today: toTotals(today),
      activeUsers,
      series: series.map((row) => ({
        bucketStart: row.bucket_start.toISOString(),
        ...toTotals(row),
      })),
      models: modelRows.map(toModelLine),
      topUsers: topUserRows.map((row) => {
        const email = emails.get(row.user_id);
        return {
          userId: row.user_id,
          maskedEmail: email === undefined ? null : maskEmail(email),
          ...toTotals(row),
        };
      }),
      tools: tools.map(toToolLine),
      workflows: workflows.map(toWorkflowLine),
      limit: query.limit,
    };
  }

  /** A disabled plan yields no policy and is reported as `limit: 0`, never as unlimited. */
  private async readFreeAllowance(userId: string, now: Date): Promise<AdminFreeAllowanceUsage> {
    const periodKey = utcMonthKey(now);
    const [policy, totals] = await Promise.all([
      this.allowance.resolvePolicy(userId),
      this.counters.findTotals(userId, periodKey),
    ]);
    return toFreeAllowanceUsage(
      policy === null ? 0 : policy.limit,
      totals.usedCount,
      periodKey,
      now,
    );
  }
}
