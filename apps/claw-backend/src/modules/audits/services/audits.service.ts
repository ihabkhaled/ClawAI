import { Injectable, Logger } from "@nestjs/common";
import { AuditLog } from "@prisma/client";
import { AuditsRepository } from "../repositories/audits.repository";
import { PaginatedResult } from "../../../common/types";
import { DEFAULT_PAGE, DEFAULT_PAGE_SIZE } from "../../../common/constants";
import { EntityNotFoundException } from "../../../common/errors";
import { CreateAuditLogInput } from "../types/audits.types";

@Injectable()
export class AuditsService {
  private readonly logger = new Logger(AuditsService.name);

  constructor(private readonly auditsRepository: AuditsRepository) {}

  async log(input: CreateAuditLogInput): Promise<void> {
    try {
      await this.auditsRepository.create({
        userId: input.userId,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId,
        severity: input.severity,
        details: input.details ? JSON.parse(JSON.stringify(input.details)) as object : undefined,
        ipAddress: input.ipAddress,
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to write audit log: ${message}`);
    }
  }

  async findAll(
    page: number = DEFAULT_PAGE,
    limit: number = DEFAULT_PAGE_SIZE,
  ): Promise<PaginatedResult<AuditLog>> {
    const skip = (page - 1) * limit;
    const { logs, total } = await this.auditsRepository.findAll({ skip, take: limit });

    return {
      data: logs,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findById(id: string): Promise<AuditLog> {
    const log = await this.auditsRepository.findById(id);
    if (!log) {
      throw new EntityNotFoundException("AuditLog", id);
    }
    return log;
  }
}
