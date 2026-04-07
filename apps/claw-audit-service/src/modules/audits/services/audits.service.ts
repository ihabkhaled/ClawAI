import { Injectable } from "@nestjs/common";
import { AuditLog } from "../schemas/audit-log.schema";
import { AuditsRepository } from "../repositories/audits.repository";
import type {
  AuditLogFilters,
  AuditStatsResponse,
  CreateAuditLogInput,
} from "../types/audits.types";
import type { PaginatedResult } from "@common/types";

@Injectable()
export class AuditsService {
  constructor(private readonly auditsRepository: AuditsRepository) {}

  async createAuditLog(input: CreateAuditLogInput): Promise<AuditLog> {
    return this.auditsRepository.createAuditLog(input);
  }

  async getAuditLogs(filters: AuditLogFilters): Promise<PaginatedResult<AuditLog>> {
    const [data, total] = await Promise.all([
      this.auditsRepository.findAll(filters),
      this.auditsRepository.countAll(filters),
    ]);

    const page = filters.page ?? 1;
    const limit = filters.limit ?? 20;

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getAuditStats(): Promise<AuditStatsResponse> {
    const [byAction, bySeverity, total] = await Promise.all([
      this.auditsRepository.aggregateByAction(),
      this.auditsRepository.aggregateBySeverity(),
      this.auditsRepository.countAll({}),
    ]);

    return { byAction, bySeverity, total };
  }
}
