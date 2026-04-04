import { Controller, Get, Post, Body, Query } from "@nestjs/common";
import { AuditLog } from "../schemas/audit-log.schema";
import { UsageLedger } from "../schemas/usage-ledger.schema";
import { AuditsService } from "../services/audits.service";
import { CreateAuditLogInput, CreateUsageLedgerInput } from "../types/audits.types";

@Controller("audits")
export class AuditsController {
  constructor(private readonly auditsService: AuditsService) {}

  @Post("logs")
  async createAuditLog(@Body() body: CreateAuditLogInput): Promise<AuditLog> {
    return this.auditsService.createAuditLog(body);
  }

  @Get("logs")
  async listAuditLogs(
    @Query("userId") userId?: string,
    @Query("action") action?: string,
    @Query("entityType") entityType?: string,
    @Query("severity") severity?: string,
  ): Promise<AuditLog[]> {
    return this.auditsService.findAuditLogs({ userId, action, entityType, severity });
  }

  @Post("usage")
  async createUsageEntry(@Body() body: CreateUsageLedgerInput): Promise<UsageLedger> {
    return this.auditsService.createUsageEntry(body);
  }

  @Get("usage")
  async listUsageEntries(
    @Query("userId") userId?: string,
    @Query("resourceType") resourceType?: string,
    @Query("action") action?: string,
  ): Promise<UsageLedger[]> {
    return this.auditsService.findUsageEntries({ userId, resourceType, action });
  }
}
