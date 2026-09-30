import { Injectable } from '@nestjs/common';
import { type PublishedArtifact } from '../../../generated/prisma';
import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import { ARTIFACT_SUMMARY_SELECT } from '../constants/artifact-summary-select.constants';
import { type ArtifactSummaryRow, type CreatePublishedArtifactData } from '../types/artifact.types';

@Injectable()
export class PublishedArtifactsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreatePublishedArtifactData): Promise<ArtifactSummaryRow> {
    return this.prisma.publishedArtifact.create({ data, select: ARTIFACT_SUMMARY_SELECT });
  }

  async findByPublicId(publicId: string): Promise<PublishedArtifact | null> {
    return this.prisma.publishedArtifact.findUnique({ where: { publicId } });
  }

  async findByUser(userId: string, page: number, limit: number): Promise<ArtifactSummaryRow[]> {
    return this.prisma.publishedArtifact.findMany({
      where: { userId },
      select: ARTIFACT_SUMMARY_SELECT,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    });
  }

  async countByUser(userId: string): Promise<number> {
    return this.prisma.publishedArtifact.count({ where: { userId } });
  }

  /** Owner-scoped: another user's id deletes nothing. Returns rows removed. */
  async deleteOwned(id: string, userId: string): Promise<number> {
    const result = await this.prisma.publishedArtifact.deleteMany({ where: { id, userId } });
    return result.count;
  }
}
