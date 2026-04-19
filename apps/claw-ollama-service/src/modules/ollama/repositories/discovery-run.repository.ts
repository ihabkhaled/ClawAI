import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import { DiscoveryRunStatus, type ModelDiscoveryRun, type Prisma } from '../../../generated/prisma';
import type { DiscoveryRunWithCounts, PaginatedRuns, RunFilter } from '../types/discovery.types';

@Injectable()
export class DiscoveryRunRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: Prisma.ModelDiscoveryRunCreateInput): Promise<ModelDiscoveryRun> {
    return this.prisma.modelDiscoveryRun.create({ data });
  }

  async findById(id: string): Promise<DiscoveryRunWithCounts | null> {
    return this.prisma.modelDiscoveryRun.findUnique({
      where: { id },
      include: { source: true },
    });
  }

  async findAll(filter: RunFilter): Promise<PaginatedRuns> {
    const where: Prisma.ModelDiscoveryRunWhereInput = {};
    if (filter.sourceId !== undefined) where.sourceId = filter.sourceId;
    if (filter.status !== undefined) where.status = filter.status;

    const skip = (filter.page - 1) * filter.pageSize;
    const [data, total] = await this.prisma.$transaction([
      this.prisma.modelDiscoveryRun.findMany({
        where,
        skip,
        take: filter.pageSize,
        orderBy: { startedAt: 'desc' },
        include: { source: true },
      }),
      this.prisma.modelDiscoveryRun.count({ where }),
    ]);

    return { data, total, page: filter.page, pageSize: filter.pageSize };
  }

  async updateStatus(
    id: string,
    status: DiscoveryRunStatus,
    extra: Partial<Prisma.ModelDiscoveryRunUpdateInput> = {},
  ): Promise<ModelDiscoveryRun> {
    return this.prisma.modelDiscoveryRun.update({
      where: { id },
      data: { status, ...extra },
    });
  }

  async markCompleted(
    id: string,
    counts: { discovered: number; imported: number; skipped: number; failed: number },
  ): Promise<ModelDiscoveryRun> {
    return this.prisma.modelDiscoveryRun.update({
      where: { id },
      data: {
        status: DiscoveryRunStatus.COMPLETED,
        discoveredCount: counts.discovered,
        importedCount: counts.imported,
        skippedCount: counts.skipped,
        failedCount: counts.failed,
        completedAt: new Date(),
      },
    });
  }

  async markFailed(id: string, errorMessage: string): Promise<ModelDiscoveryRun> {
    return this.prisma.modelDiscoveryRun.update({
      where: { id },
      data: {
        status: DiscoveryRunStatus.FAILED,
        errorMessage,
        completedAt: new Date(),
      },
    });
  }

  async findLatestCompleted(sourceId: string): Promise<ModelDiscoveryRun | null> {
    return this.prisma.modelDiscoveryRun.findFirst({
      where: { sourceId, status: DiscoveryRunStatus.COMPLETED },
      orderBy: { completedAt: 'desc' },
    });
  }
}
