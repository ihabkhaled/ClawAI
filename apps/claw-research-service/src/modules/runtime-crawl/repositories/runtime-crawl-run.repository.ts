import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import { type Prisma, type RuntimeCrawlRun, RuntimeCrawlStatus } from '../../../generated/prisma';
import type { RuntimeCrawlUsageSnapshot } from '../types/runtime-crawl.types';

@Injectable()
export class RuntimeCrawlRunRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: Prisma.RuntimeCrawlRunCreateInput): Promise<RuntimeCrawlRun> {
    return this.prisma.runtimeCrawlRun.create({ data });
  }

  async update(id: string, data: Prisma.RuntimeCrawlRunUpdateInput): Promise<RuntimeCrawlRun> {
    return this.prisma.runtimeCrawlRun.update({ where: { id }, data });
  }

  /** Owner-scoped: another user's id finds nothing. */
  async findOwned(id: string, userId: string): Promise<RuntimeCrawlRun | null> {
    return this.prisma.runtimeCrawlRun.findFirst({ where: { id, userId } });
  }

  async listByUser(userId: string, limit: number): Promise<RuntimeCrawlRun[]> {
    return this.prisma.runtimeCrawlRun.findMany({
      where: { userId },
      orderBy: { startedAt: 'desc' },
      take: limit,
    });
  }

  /**
   * What the caps are measured against. A RUNNING run counts its whole page
   * allowance (its pages are not known yet); a finished one counts what it read.
   * RUNNING rows older than `staleBefore` are dead runs and count for nothing.
   */
  async usageSince(
    userId: string,
    since: Date,
    staleBefore: Date,
  ): Promise<RuntimeCrawlUsageSnapshot> {
    const rows = await this.prisma.runtimeCrawlRun.findMany({
      where: { userId, startedAt: { gte: since } },
      select: { status: true, startedAt: true, maxPages: true, pagesFetched: true },
    });
    const live = rows.filter(
      (row) => row.status !== RuntimeCrawlStatus.RUNNING || row.startedAt >= staleBefore,
    );
    return {
      running: live.filter((row) => row.status === RuntimeCrawlStatus.RUNNING).length,
      runsToday: rows.length,
      pagesToday: live.reduce(
        (sum, row) =>
          sum + (row.status === RuntimeCrawlStatus.RUNNING ? row.maxPages : row.pagesFetched),
        0,
      ),
    };
  }

  /** Boot sweep: a RUNNING row that outlived its timeout died with its process. */
  async failStale(staleBefore: Date, errorCode: string, errorMessage: string): Promise<number> {
    const result = await this.prisma.runtimeCrawlRun.updateMany({
      where: { status: RuntimeCrawlStatus.RUNNING, startedAt: { lt: staleBefore } },
      data: {
        status: RuntimeCrawlStatus.FAILED,
        errorCode,
        errorMessage,
        completedAt: new Date(),
      },
    });
    return result.count;
  }
}
