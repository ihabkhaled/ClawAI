import { Injectable, Logger } from '@nestjs/common';
import { AuditLog } from '../schemas/audit-log.schema';
import { AuditsRepository } from '../repositories/audits.repository';
import type {
  AuditLogFilters,
  AuditStatsResponse,
  CreateAuditLogInput,
} from '../types/audits.types';
import type { PaginatedResult } from '@common/types';
import { DEFAULT_PAGE, DEFAULT_PAGE_SIZE } from '@common/constants';

@Injectable()
export class AuditsService {
  private readonly logger = new Logger(AuditsService.name);

  constructor(private readonly auditsRepository: AuditsRepository) {}

  async createAuditLog(input: CreateAuditLogInput): Promise<AuditLog> {
    this.logger.debug(
      `createAuditLog: action=${input.action} entity=${input.entityType}/${input.entityId ?? 'none'}`,
    );
    try {
      const doc = await this.auditsRepository.createAuditLog(input);
      this.logger.log(
        `createAuditLog: persisted action=${input.action} severity=${input.severity}`,
      );
      return doc;
    } catch (error) {
      this.logger.error(
        `createAuditLog: failed action=${input.action} — ${(error as Error).message}`,
      );
      throw error;
    }
  }

  async getAuditLogs(filters: AuditLogFilters): Promise<PaginatedResult<AuditLog>> {
    this.logger.debug(`getAuditLogs: page=${String(filters.page)} limit=${String(filters.limit)}`);
    try {
      const [data, total] = await Promise.all([
        this.auditsRepository.findAll(filters),
        this.auditsRepository.countAll(filters),
      ]);

      const page = filters.page ?? DEFAULT_PAGE;
      const limit = filters.limit ?? DEFAULT_PAGE_SIZE;

      return {
        data,
        meta: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      this.logger.error(`getAuditLogs: failed — ${(error as Error).message}`);
      throw error;
    }
  }

  async getAuditStats(): Promise<AuditStatsResponse> {
    this.logger.debug('getAuditStats: computing audit statistics');
    try {
      const [byAction, bySeverity, total] = await Promise.all([
        this.auditsRepository.aggregateByAction(),
        this.auditsRepository.aggregateBySeverity(),
        this.auditsRepository.countAll({}),
      ]);

      this.logger.debug(`getAuditStats: total=${String(total)}`);
      return { byAction, bySeverity, total };
    } catch (error) {
      this.logger.error(`getAuditStats: failed — ${(error as Error).message}`);
      throw error;
    }
  }
}
