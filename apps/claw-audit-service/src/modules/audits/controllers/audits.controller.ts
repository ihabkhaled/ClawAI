import { Controller, Get, Query } from "@nestjs/common";
import { AuditsService } from "../services/audits.service";
import { UsageService } from "../services/usage.service";
import type { ListAuditsQueryDto } from "../dtos/list-audits-query.dto";
import type { ListUsageQueryDto } from "../dtos/list-usage-query.dto";
import type { AuditStatsResponse, UsageSummaryResponse, CostSummaryResult, LatencySummaryResult } from "../types/audits.types";
import type { PaginatedResult } from "@common/types";
import type { AuditLog } from "../schemas/audit-log.schema";
import type { UsageLedger } from "../schemas/usage-ledger.schema";

@Controller()
export class AuditsController {
  constructor(
    private readonly auditsService: AuditsService,
    private readonly usageService: UsageService,
  ) {}

  @Get("audits")
  async listAuditLogs(
    @Query() query: ListAuditsQueryDto,
  ): Promise<PaginatedResult<AuditLog>> {
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

  @Get("audits/stats")
  async getAuditStats(): Promise<AuditStatsResponse> {
    return this.auditsService.getAuditStats();
  }

  @Get("usage")
  async listUsageEntries(
    @Query() query: ListUsageQueryDto,
  ): Promise<PaginatedResult<UsageLedger>> {
    return this.usageService.getUsageEntries({
      page: query.page,
      limit: query.limit,
      provider: query.provider,
      model: query.model,
      startDate: query.startDate,
      endDate: query.endDate,
    });
  }

  @Get("usage/summary")
  async getUsageSummary(): Promise<UsageSummaryResponse> {
    return this.usageService.getUsageSummary();
  }

  @Get("usage/cost")
  async getCostSummary(): Promise<CostSummaryResult> {
    return this.usageService.getCostSummary();
  }

  @Get("usage/latency")
  async getLatencySummary(): Promise<LatencySummaryResult> {
    return this.usageService.getLatencySummary();
  }
}
