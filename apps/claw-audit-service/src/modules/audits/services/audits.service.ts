import { Injectable } from "@nestjs/common";
import { AuditLog } from "../schemas/audit-log.schema";
import { UsageLedger } from "../schemas/usage-ledger.schema";
import { AuditsRepository } from "../repositories/audits.repository";
import {
  AuditLogFilters,
  CreateAuditLogInput,
  CreateUsageLedgerInput,
  UsageLedgerFilters,
} from "../types/audits.types";

@Injectable()
export class AuditsService {
  constructor(private readonly auditsRepository: AuditsRepository) {}

  async createAuditLog(input: CreateAuditLogInput): Promise<AuditLog> {
    return this.auditsRepository.createAuditLog(input);
  }

  async findAuditLogs(filters: AuditLogFilters): Promise<AuditLog[]> {
    return this.auditsRepository.findAuditLogs(filters);
  }

  async createUsageEntry(input: CreateUsageLedgerInput): Promise<UsageLedger> {
    return this.auditsRepository.createUsageEntry(input);
  }

  async findUsageEntries(filters: UsageLedgerFilters): Promise<UsageLedger[]> {
    return this.auditsRepository.findUsageEntries(filters);
  }
}
