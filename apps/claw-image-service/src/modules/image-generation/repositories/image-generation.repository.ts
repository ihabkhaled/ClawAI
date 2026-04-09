import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import { type ImageGenerationStatus } from '../../../generated/prisma';
import { type ImageGenerationRecord } from '../types/image-generation.types';

@Injectable()
export class ImageGenerationRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: {
    userId: string;
    threadId?: string;
    messageId?: string;
    prompt: string;
    provider: string;
    model: string;
    width: number;
    height: number;
    quality?: string;
    style?: string;
  }): Promise<ImageGenerationRecord> {
    return this.prisma.imageGeneration.create({ data });
  }

  async findById(id: string): Promise<ImageGenerationRecord | null> {
    return this.prisma.imageGeneration.findUnique({ where: { id } });
  }

  async findByUserId(
    userId: string,
    page: number,
    limit: number,
  ): Promise<ImageGenerationRecord[]> {
    const skip = (page - 1) * limit;
    return this.prisma.imageGeneration.findMany({
      where: { userId },
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
    });
  }

  async countByUserId(userId: string): Promise<number> {
    return this.prisma.imageGeneration.count({ where: { userId } });
  }

  async updateStatus(
    id: string,
    status: ImageGenerationStatus,
    extra?: {
      fileId?: string;
      revisedPrompt?: string;
      latencyMs?: number;
      errorMessage?: string;
    },
  ): Promise<ImageGenerationRecord> {
    return this.prisma.imageGeneration.update({
      where: { id },
      data: { status, ...extra },
    });
  }
}
