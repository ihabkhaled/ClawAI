import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import { RUNTIME_CRAWL_CONFIG_ID } from '../constants/runtime-crawl.constants';
import type { Prisma, RuntimeCrawlConfig } from '../../../generated/prisma';

@Injectable()
export class RuntimeCrawlConfigRepository {
  constructor(private readonly prisma: PrismaService) {}

  async find(): Promise<RuntimeCrawlConfig | null> {
    return this.prisma.runtimeCrawlConfig.findUnique({ where: { id: RUNTIME_CRAWL_CONFIG_ID } });
  }

  async create(
    data: Omit<Prisma.RuntimeCrawlConfigCreateInput, 'id'>,
  ): Promise<RuntimeCrawlConfig> {
    return this.prisma.runtimeCrawlConfig.create({
      data: { id: RUNTIME_CRAWL_CONFIG_ID, ...data },
    });
  }

  async update(data: Prisma.RuntimeCrawlConfigUpdateInput): Promise<RuntimeCrawlConfig> {
    return this.prisma.runtimeCrawlConfig.update({ where: { id: RUNTIME_CRAWL_CONFIG_ID }, data });
  }
}
