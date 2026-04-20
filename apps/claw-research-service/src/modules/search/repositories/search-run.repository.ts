import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import type { Prisma, SearchRun } from '../../../generated/prisma';

@Injectable()
export class SearchRunRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: Prisma.SearchRunCreateInput): Promise<SearchRun> {
    return this.prisma.searchRun.create({ data });
  }

  async update(id: string, data: Prisma.SearchRunUpdateInput): Promise<SearchRun> {
    return this.prisma.searchRun.update({ where: { id }, data });
  }

  async findById(id: string, userId: string): Promise<SearchRun | null> {
    return this.prisma.searchRun.findFirst({ where: { id, userId } });
  }

  async listByUser(userId: string, limit: number): Promise<SearchRun[]> {
    return this.prisma.searchRun.findMany({
      where: { userId },
      orderBy: { startedAt: 'desc' },
      take: limit,
    });
  }
}
