import { Injectable } from '@nestjs/common';

import { toInputJson } from '../../../common/utilities/prisma-json.utility';
import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import type { RuntimeCrawlPage } from '../../../generated/prisma';
import type { RuntimeCrawlPageRow } from '../types/runtime-crawl.types';

@Injectable()
export class RuntimeCrawlPageRepository {
  constructor(private readonly prisma: PrismaService) {}

  async createMany(runId: string, rows: RuntimeCrawlPageRow[]): Promise<void> {
    if (rows.length === 0) {
      return;
    }
    await this.prisma.runtimeCrawlPage.createMany({
      data: rows.map((row) => ({
        ...row,
        runId,
        links: toInputJson(row.links),
        injectionFlags: toInputJson(row.injectionFlags),
      })),
    });
  }

  /** `limit + 1` rows so the caller can tell whether another page exists. */
  async listAfter(runId: string, after: number, limit: number): Promise<RuntimeCrawlPage[]> {
    return this.prisma.runtimeCrawlPage.findMany({
      where: { runId, ordinal: { gt: after } },
      orderBy: { ordinal: 'asc' },
      take: limit + 1,
    });
  }
}
