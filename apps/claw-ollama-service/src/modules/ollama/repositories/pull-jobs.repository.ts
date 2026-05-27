import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import { type PullJob, type PullJobStatus } from '../../../generated/prisma';
import { type CreatePullJobData, type UpdatePullJobData } from '../types/ollama.types';

@Injectable()
export class PullJobsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreatePullJobData): Promise<PullJob> {
    return this.prisma.pullJob.create({ data });
  }

  async findById(id: string): Promise<PullJob | null> {
    return this.prisma.pullJob.findUnique({ where: { id } });
  }

  async update(id: string, data: UpdatePullJobData): Promise<PullJob> {
    return this.prisma.pullJob.update({ where: { id }, data });
  }

  async findRecent(limit: number): Promise<PullJob[]> {
    return this.prisma.pullJob.findMany({
      orderBy: { startedAt: 'desc' },
      take: limit,
    });
  }

  async findByModelAndStatus(modelName: string, status: PullJobStatus): Promise<PullJob | null> {
    return this.prisma.pullJob.findFirst({
      where: { modelName, status },
      orderBy: { startedAt: 'desc' },
    });
  }

  async findActiveByModelName(modelName: string): Promise<PullJob | null> {
    return this.prisma.pullJob.findFirst({
      where: {
        modelName,
        status: { in: ['PENDING', 'IN_PROGRESS', 'INSTALLING'] },
      },
      orderBy: { startedAt: 'desc' },
    });
  }

  async findAllResumable(): Promise<PullJob[]> {
    return this.prisma.pullJob.findMany({
      where: {
        status: { in: ['PENDING', 'IN_PROGRESS', 'INSTALLING'] },
      },
      orderBy: { startedAt: 'asc' },
    });
  }

  async deleteByModelName(modelName: string): Promise<number> {
    const result = await this.prisma.pullJob.deleteMany({ where: { modelName } });
    return result.count;
  }

  async deleteOlderByModelName(modelName: string, keepJobId: string): Promise<number> {
    const result = await this.prisma.pullJob.deleteMany({
      where: { modelName, id: { not: keepJobId } },
    });
    return result.count;
  }

  async findLatestByModelName(modelName: string): Promise<PullJob | null> {
    return this.prisma.pullJob.findFirst({
      where: { modelName },
      orderBy: { startedAt: 'desc' },
    });
  }

  async incrementRetryAttempts(id: string): Promise<void> {
    await this.prisma.pullJob.update({
      where: { id },
      data: { retryAttempts: { increment: 1 } },
    });
  }

  async incrementInstallAttempts(id: string): Promise<void> {
    await this.prisma.pullJob.update({
      where: { id },
      data: { installAttempts: { increment: 1 } },
    });
  }

  async markResumed(id: string): Promise<void> {
    await this.prisma.pullJob.update({
      where: { id },
      data: { resumedAt: new Date() },
    });
  }
}
