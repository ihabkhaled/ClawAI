import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import type { PageCache, Prisma } from '../../../generated/prisma';

@Injectable()
export class PageCacheRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByKey(key: string): Promise<PageCache | null> {
    return this.prisma.pageCache.findUnique({ where: { key } });
  }

  async upsert(key: string, data: Prisma.PageCacheCreateInput): Promise<PageCache> {
    return this.prisma.pageCache.upsert({
      where: { key },
      create: data,
      update: {
        finalUrl: data.finalUrl,
        httpStatus: data.httpStatus,
        mimeType: data.mimeType,
        title: data.title,
        content: data.content,
        links: data.links,
        byteSize: data.byteSize,
        fetchedAt: new Date(),
        expiresAt: data.expiresAt,
      },
    });
  }

  async deleteExpired(): Promise<number> {
    const result = await this.prisma.pageCache.deleteMany({
      where: { expiresAt: { lt: new Date() } },
    });
    return result.count;
  }
}
