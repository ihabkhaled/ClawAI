import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import type { Prisma, ResearchSource } from '../../../generated/prisma';

/** Evidence store rows (research engine B1). Pure data access. */
@Injectable()
export class ResearchSourceRepository {
  constructor(private readonly prisma: PrismaService) {}

  async createMany(rows: Prisma.ResearchSourceCreateManyInput[]): Promise<number> {
    const result = await this.prisma.researchSource.createMany({ data: rows });
    return result.count;
  }

  /** One user's sources for one thread since `since`, newest first. */
  async findRecentByThread(
    userId: string,
    threadId: string,
    since: Date,
    take: number,
  ): Promise<ResearchSource[]> {
    return this.prisma.researchSource.findMany({
      where: { userId, threadId, createdAt: { gte: since } },
      orderBy: { createdAt: 'desc' },
      take,
    });
  }

  async deleteOlderThan(cutoff: Date): Promise<number> {
    const result = await this.prisma.researchSource.deleteMany({
      where: { createdAt: { lt: cutoff } },
    });
    return result.count;
  }
}
