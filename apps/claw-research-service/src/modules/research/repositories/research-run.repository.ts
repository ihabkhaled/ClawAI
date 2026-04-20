import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import type { Prisma, ResearchRun } from '../../../generated/prisma';

@Injectable()
export class ResearchRunRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: Prisma.ResearchRunCreateInput): Promise<ResearchRun> {
    return this.prisma.researchRun.create({ data });
  }

  async update(id: string, data: Prisma.ResearchRunUpdateInput): Promise<ResearchRun> {
    return this.prisma.researchRun.update({ where: { id }, data });
  }

  async findById(id: string, userId: string): Promise<ResearchRun | null> {
    return this.prisma.researchRun.findFirst({ where: { id, userId } });
  }

  async listByUser(userId: string, limit: number): Promise<ResearchRun[]> {
    return this.prisma.researchRun.findMany({
      where: { userId },
      orderBy: { startedAt: 'desc' },
      take: limit,
    });
  }
}
