import { Injectable, Logger } from '@nestjs/common';
import { type PullJob as PrismaPullJobRow } from '../../../generated/prisma';
import { PullJobStatus } from '../../../common/enums';
import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import { type PullJob } from '../types/pull-job.types';

@Injectable()
export class PullJobsRepository {
  private readonly logger = new Logger(PullJobsRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(payload: {
    modelId: string;
    totalBytes: bigint;
    totalFiles: number;
    initiatedByUser?: string | null;
  }): Promise<PullJob> {
    this.logger.log(`create: model=${payload.modelId} bytes=${payload.totalBytes}`);
    const row = await this.prisma.pullJob.create({
      data: {
        modelId: payload.modelId,
        status: PullJobStatus.PENDING,
        totalBytes: payload.totalBytes,
        totalFiles: payload.totalFiles,
        initiatedByUser: payload.initiatedByUser ?? null,
      },
    });
    return this.toDomain(row);
  }

  async findById(id: string): Promise<PullJob | null> {
    const row = await this.prisma.pullJob.findUnique({ where: { id } });
    return row ? this.toDomain(row) : null;
  }

  async findActiveForModel(modelId: string): Promise<PullJob | null> {
    const row = await this.prisma.pullJob.findFirst({
      where: { modelId, status: { in: [PullJobStatus.PENDING, PullJobStatus.RUNNING] } },
      orderBy: { startedAt: 'desc' },
    });
    return row ? this.toDomain(row) : null;
  }

  async list(filters: { status?: PullJobStatus; modelId?: string; limit?: number }): Promise<{
    rows: PullJob[];
    total: number;
  }> {
    const where: { status?: PullJobStatus; modelId?: string } = {};
    if (filters.status) {
      where.status = filters.status;
    }
    if (filters.modelId) {
      where.modelId = filters.modelId;
    }
    const [rows, total] = await Promise.all([
      this.prisma.pullJob.findMany({ where, orderBy: { startedAt: 'desc' }, take: filters.limit ?? 50 }),
      this.prisma.pullJob.count({ where }),
    ]);
    return { rows: rows.map((row) => this.toDomain(row)), total };
  }

  async updateStatus(
    id: string,
    status: PullJobStatus,
    extra?: { reasonCode?: string; errorMessage?: string; completedAt?: Date | null },
  ): Promise<void> {
    this.logger.log(`updateStatus: ${id} → ${status}`);
    await this.prisma.pullJob.update({
      where: { id },
      data: {
        status,
        reasonCode: extra?.reasonCode ?? null,
        errorMessage: extra?.errorMessage ?? null,
        completedAt: extra?.completedAt ?? null,
      },
    });
  }

  async updateProgress(
    id: string,
    payload: { downloadedBytes: bigint; completedFiles: number; currentFile: string | null },
  ): Promise<void> {
    await this.prisma.pullJob.update({
      where: { id },
      data: payload,
    });
  }

  private toDomain(row: PrismaPullJobRow): PullJob {
    return {
      id: row.id,
      modelId: row.modelId,
      status: row.status as PullJobStatus,
      totalBytes: row.totalBytes,
      downloadedBytes: row.downloadedBytes,
      totalFiles: row.totalFiles,
      completedFiles: row.completedFiles,
      currentFile: row.currentFile,
      reasonCode: row.reasonCode,
      errorMessage: row.errorMessage,
      startedAt: row.startedAt,
      completedAt: row.completedAt,
      initiatedByUser: row.initiatedByUser,
    };
  }
}
