import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import type { FetchJob, Prisma } from '../../../generated/prisma';

@Injectable()
export class FetchJobRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: Prisma.FetchJobCreateInput): Promise<FetchJob> {
    return this.prisma.fetchJob.create({ data });
  }

  async update(id: string, data: Prisma.FetchJobUpdateInput): Promise<FetchJob> {
    return this.prisma.fetchJob.update({ where: { id }, data });
  }

  async findById(id: string, userId: string): Promise<FetchJob | null> {
    return this.prisma.fetchJob.findFirst({ where: { id, userId } });
  }

  async listByUser(userId: string, limit: number): Promise<FetchJob[]> {
    return this.prisma.fetchJob.findMany({
      where: { userId },
      orderBy: { startedAt: 'desc' },
      take: limit,
    });
  }
}
