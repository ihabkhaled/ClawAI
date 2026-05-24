import { Injectable } from '@nestjs/common';
import type { MemoryUsage } from '../../../generated/prisma';
import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import type { WriteMemoryUsageData } from '../types/memory-usage.types';

export type { WriteMemoryUsageData };

@Injectable()
export class MemoryUsageRepository {
  constructor(private readonly prisma: PrismaService) {}

  async writeMany(rows: WriteMemoryUsageData[]): Promise<number> {
    if (rows.length === 0) {
      return 0;
    }
    const result = await this.prisma.memoryUsage.createMany({
      data: rows.map((r) => ({
        memoryId: r.memoryId,
        userId: r.userId,
        threadId: r.threadId,
        messageId: r.messageId,
        score: r.score,
        reason: r.reason ?? null,
      })),
    });
    return result.count;
  }

  async findByMemoryId(memoryId: string, limit = 50): Promise<MemoryUsage[]> {
    return this.prisma.memoryUsage.findMany({
      where: { memoryId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  async findByMessageId(messageId: string): Promise<MemoryUsage[]> {
    return this.prisma.memoryUsage.findMany({ where: { messageId } });
  }
}
