import { Injectable, Logger } from '@nestjs/common';
import type { MemoryUsage } from '../../../generated/prisma';
import {
  MemoryUsageRepository,
  type WriteMemoryUsageData,
} from '../repositories/memory-usage.repository';

@Injectable()
export class MemoryUsageService {
  private readonly logger = new Logger(MemoryUsageService.name);

  constructor(private readonly repo: MemoryUsageRepository) {}

  async record(rows: WriteMemoryUsageData[]): Promise<number> {
    if (rows.length === 0) {
      return 0;
    }
    this.logger.debug(`record: writing ${String(rows.length)} usage row(s)`);
    return this.repo.writeMany(rows);
  }

  async getByMemoryId(memoryId: string, userId: string, limit?: number): Promise<MemoryUsage[]> {
    const rows = await this.repo.findByMemoryId(memoryId, limit);
    return rows.filter((row) => row.userId === userId);
  }

  async getByMessageId(messageId: string, userId: string): Promise<MemoryUsage[]> {
    const rows = await this.repo.findByMessageId(messageId);
    return rows.filter((row) => row.userId === userId);
  }
}
