import { Injectable } from '@nestjs/common';
import { type ReplayRun } from '../../../generated/prisma';
import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import type { CreateReplayRunData } from '../types/replay-run.types';

@Injectable()
export class ReplayRunsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateReplayRunData): Promise<ReplayRun> {
    return this.prisma.replayRun.create({
      data: {
        name: data.name,
        filters: data.filters,
        totalReplayed: data.totalReplayed,
        changedCount: data.changedCount,
        suspiciousCount: data.suspiciousCount,
        avgConfOld: data.avgConfOld,
        avgConfNew: data.avgConfNew,
        avgImprovement: data.avgImprovement,
        labelBreakdown: data.labelBreakdown,
      },
    });
  }

  async findById(id: string): Promise<ReplayRun | null> {
    return this.prisma.replayRun.findUnique({ where: { id } });
  }

  async findAll(page: number, limit: number): Promise<ReplayRun[]> {
    const skip = (page - 1) * limit;
    return this.prisma.replayRun.findMany({
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
    });
  }

  async countAll(): Promise<number> {
    return this.prisma.replayRun.count();
  }
}
