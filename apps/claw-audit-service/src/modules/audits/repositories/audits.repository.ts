import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { AuditLog } from "../schemas/audit-log.schema";
import { UsageLedger } from "../schemas/usage-ledger.schema";
import {
  AuditLogFilters,
  CreateAuditLogInput,
  CreateUsageLedgerInput,
  UsageLedgerFilters,
} from "../types/audits.types";

@Injectable()
export class AuditsRepository {
  constructor(
    @InjectModel(AuditLog.name) private readonly auditLogModel: Model<AuditLog>,
    @InjectModel(UsageLedger.name) private readonly usageLedgerModel: Model<UsageLedger>,
  ) {}

  async createAuditLog(input: CreateAuditLogInput): Promise<AuditLog> {
    const doc = new this.auditLogModel(input);
    return doc.save();
  }

  async findAuditLogs(filters: AuditLogFilters): Promise<AuditLog[]> {
    const query: Record<string, unknown> = {};
    if (filters.userId) query["userId"] = filters.userId;
    if (filters.action) query["action"] = filters.action;
    if (filters.entityType) query["entityType"] = filters.entityType;
    if (filters.severity) query["severity"] = filters.severity;

    return this.auditLogModel.find(query).sort({ createdAt: -1 }).exec();
  }

  async createUsageEntry(input: CreateUsageLedgerInput): Promise<UsageLedger> {
    const doc = new this.usageLedgerModel(input);
    return doc.save();
  }

  async findUsageEntries(filters: UsageLedgerFilters): Promise<UsageLedger[]> {
    const query: Record<string, unknown> = {};
    if (filters.userId) query["userId"] = filters.userId;
    if (filters.resourceType) query["resourceType"] = filters.resourceType;
    if (filters.action) query["action"] = filters.action;

    return this.usageLedgerModel.find(query).sort({ createdAt: -1 }).exec();
  }
}
