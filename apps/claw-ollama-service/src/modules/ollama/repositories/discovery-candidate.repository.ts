import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import {
  CandidateStatus,
  type ModelDiscoveryCandidate,
  type Prisma,
} from '../../../generated/prisma';
import type { CandidateFilter, PaginatedCandidates } from '../types/discovery.types';

@Injectable()
export class DiscoveryCandidateRepository {
  constructor(private readonly prisma: PrismaService) {}

  async bulkCreate(data: Prisma.ModelDiscoveryCandidateCreateManyInput[]): Promise<number> {
    if (data.length === 0) return 0;
    const result = await this.prisma.modelDiscoveryCandidate.createMany({
      data,
      skipDuplicates: true,
    });
    return result.count;
  }

  async findById(id: string): Promise<ModelDiscoveryCandidate | null> {
    return this.prisma.modelDiscoveryCandidate.findUnique({ where: { id } });
  }

  async findByRunId(runId: string): Promise<ModelDiscoveryCandidate[]> {
    return this.prisma.modelDiscoveryCandidate.findMany({
      where: { runId },
      orderBy: [{ confidence: 'desc' }, { displayName: 'asc' }],
    });
  }

  async findAll(filter: CandidateFilter): Promise<PaginatedCandidates> {
    const where: Prisma.ModelDiscoveryCandidateWhereInput = {};
    if (filter.status !== undefined) where.status = filter.status;
    if (filter.runId !== undefined) where.runId = filter.runId;
    if (filter.category !== undefined) where.suggestedCategory = filter.category;
    if (filter.downloadStatus !== undefined) where.downloadStatus = filter.downloadStatus;
    if (filter.search !== undefined && filter.search.trim().length > 0) {
      const search = filter.search.trim();
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { displayName: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    const skip = (filter.page - 1) * filter.pageSize;
    const [data, total] = await this.prisma.$transaction([
      this.prisma.modelDiscoveryCandidate.findMany({
        where,
        skip,
        take: filter.pageSize,
        orderBy: [{ status: 'asc' }, { confidence: 'desc' }, { displayName: 'asc' }],
      }),
      this.prisma.modelDiscoveryCandidate.count({ where }),
    ]);

    return { data, total, page: filter.page, pageSize: filter.pageSize };
  }

  async updateStatus(
    id: string,
    status: CandidateStatus,
    extra: Partial<Prisma.ModelDiscoveryCandidateUpdateInput> = {},
  ): Promise<ModelDiscoveryCandidate> {
    return this.prisma.modelDiscoveryCandidate.update({
      where: { id },
      data: { status, ...extra },
    });
  }

  async markImported(id: string, importedEntryId: string): Promise<ModelDiscoveryCandidate> {
    return this.prisma.modelDiscoveryCandidate.update({
      where: { id },
      data: { status: CandidateStatus.IMPORTED, importedEntryId },
    });
  }

  async markRejected(id: string, reason: string): Promise<ModelDiscoveryCandidate> {
    return this.prisma.modelDiscoveryCandidate.update({
      where: { id },
      data: { status: CandidateStatus.REJECTED, rejectionReason: reason },
    });
  }

  async markDuplicate(id: string, duplicateOfId?: string): Promise<ModelDiscoveryCandidate> {
    return this.prisma.modelDiscoveryCandidate.update({
      where: { id },
      data: { status: CandidateStatus.DUPLICATE, duplicateOfId: duplicateOfId ?? null },
    });
  }

  async countByStatus(status: CandidateStatus): Promise<number> {
    return this.prisma.modelDiscoveryCandidate.count({ where: { status } });
  }

  async findByOllamaName(ollamaName: string): Promise<ModelDiscoveryCandidate | null> {
    return this.prisma.modelDiscoveryCandidate.findFirst({
      where: { ollamaName: { equals: ollamaName, mode: 'insensitive' } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async deleteOlderThan(cutoff: Date, keepStatus: CandidateStatus[]): Promise<number> {
    const result = await this.prisma.modelDiscoveryCandidate.deleteMany({
      where: {
        createdAt: { lt: cutoff },
        status: { notIn: keepStatus },
      },
    });
    return result.count;
  }
}
