import { Injectable, Logger } from '@nestjs/common';
import type { MemoryAuditLog } from '../../../generated/prisma';
import { MemoryAuditLogRepository } from '../repositories/memory-audit-log.repository';
import type { WriteAuditLogData } from '../types/memory-audit.types';

@Injectable()
export class MemoryAuditService {
  private readonly logger = new Logger(MemoryAuditService.name);

  constructor(private readonly repo: MemoryAuditLogRepository) {}

  async record(data: WriteAuditLogData): Promise<MemoryAuditLog> {
    this.logger.debug(
      `record: action=${data.action} memoryId=${data.memoryId ?? '(none)'} actor=${data.actor}`,
    );
    try {
      const row = await this.repo.write(data);
      this.logger.log(
        `record: persisted audit row id=${row.id} action=${data.action} userId=${data.userId}`,
      );
      return row;
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'unknown';
      this.logger.error(`record: failed to persist audit row — ${msg}`);
      throw error;
    }
  }

  async getMemoryHistory(memoryId: string, userId: string): Promise<MemoryAuditLog[]> {
    this.logger.debug(`getMemoryHistory: memoryId=${memoryId} userId=${userId}`);
    const rows = await this.repo.findByMemoryId(memoryId);
    return rows.filter((row) => row.userId === userId);
  }

  async getUserHistory(userId: string, limit?: number): Promise<MemoryAuditLog[]> {
    return this.repo.findByUserId(userId, limit);
  }
}
