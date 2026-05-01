import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';

@Injectable()
export class SuggestionDeduplicationRepository {
  constructor(private readonly prisma: PrismaService) {}

  async exists(userId: string, sourceObjectId: string, actionKind: string): Promise<boolean> {
    const found = await this.prisma.suggestionDeduplication.findFirst({
      where: { userId, sourceObjectId, actionKind, expiresAt: { gt: new Date() } },
      select: { id: true },
    });
    return found !== null;
  }

  async record(
    userId: string,
    sourceObjectId: string,
    actionKind: string,
    jobType: string,
    ttlDays: number,
  ): Promise<void> {
    const expiresAt = new Date(Date.now() + ttlDays * 24 * 60 * 60 * 1000);
    await this.prisma.suggestionDeduplication.upsert({
      where: {
        userId_sourceObjectId_actionKind: { userId, sourceObjectId, actionKind },
      },
      create: { userId, sourceObjectId, actionKind, jobType, expiresAt },
      update: { jobType, expiresAt, suggestedAt: new Date() },
    });
  }

  async sweepExpired(now: Date, limit: number): Promise<number> {
    const result = await this.prisma.suggestionDeduplication.deleteMany({
      where: { expiresAt: { lt: now } },
    });
    return Math.min(result.count, limit);
  }
}
