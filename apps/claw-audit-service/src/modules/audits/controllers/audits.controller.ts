import { Controller, Get, Query } from '@nestjs/common';
import { RequirePermissions } from '@claw/shared-entitlements';
import { Permission } from '@claw/shared-types';
import { AuditsService } from '../services/audits.service';
import { UsageService } from '../services/usage.service';
import type { ListAuditsQueryDto } from '../dtos/list-audits-query.dto';
import type { ListUsageQueryDto } from '../dtos/list-usage-query.dto';
import type {
  AuditStatsResponse,
  CostSummaryResult,
  LatencySummaryResult,
  UsageSummaryResponse,
} from '../types/audits.types';
import type { PaginatedResult } from '@common/types';
import type { AuditLog } from '../schemas/audit-log.schema';
import type { UsageLedger } from '../schemas/usage-ledger.schema';

@Controller()
export class AuditsController {
  constructor(
    private readonly auditsService: AuditsService,
    private readonly usageService: UsageService,
  ) {}

  @Get('audits')
  @RequirePermissions(Permission.ADMIN_SYSTEM_VIEW)
  async listAuditLogs(@Query() query: ListAuditsQueryDto): Promise<PaginatedResult<AuditLog>> {
    return this.auditsService.getAuditLogs({
      page: query.page,
      limit: query.limit,
      action: query.action,
      severity: query.severity,
      entityType: query.entityType,
      startDate: query.startDate,
      endDate: query.endDate,
      search: query.search,
    });
  }

  @Get('audits/stats')
  @RequirePermissions(Permission.ADMIN_SYSTEM_VIEW)
  async getAuditStats(): Promise<AuditStatsResponse> {
    return this.auditsService.getAuditStats();
  }

  @Get('usage')
  @RequirePermissions(Permission.ADMIN_USAGE_VIEW)
  async listUsageEntries(@Query() query: ListUsageQueryDto): Promise<PaginatedResult<UsageLedger>> {
    return this.usageService.getUsageEntries({
      page: query.page,
      limit: query.limit,
      provider: query.provider,
      model: query.model,
      context: query.context,
      startDate: query.startDate,
      endDate: query.endDate,
    });
  }

  @Get('usage/summary')
  @RequirePermissions(Permission.ADMIN_USAGE_VIEW)
  async getUsageSummary(): Promise<UsageSummaryResponse> {
    return this.usageService.getUsageSummary();
  }

  @Get('usage/cost')
  @RequirePermissions(Permission.ADMIN_USAGE_VIEW)
  async getCostSummary(): Promise<CostSummaryResult> {
    return this.usageService.getCostSummary();
  }

  @Get('usage/latency')
  @RequirePermissions(Permission.ADMIN_USAGE_VIEW)
  async getLatencySummary(): Promise<LatencySummaryResult> {
    return this.usageService.getLatencySummary();
  }
}
