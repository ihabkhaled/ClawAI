import { Injectable } from '@nestjs/common';
import { type Prisma, type ImageGenerationStatus } from '../../../generated/prisma';
import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import {
  type ImageGenerationAssetRecord,
  type ImageGenerationRecord,
} from '../types/image-generation.types';

@Injectable()
export class ImageGenerationRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: {
    userId: string;
    threadId?: string;
    userMessageId?: string;
    assistantMessageId?: string;
    prompt: string;
    provider: string;
    model: string;
    width?: number;
    height?: number;
    quality?: string;
    style?: string;
  }): Promise<ImageGenerationRecord> {
    return this.prisma.imageGeneration.create({
      data: {
        userId: data.userId,
        threadId: data.threadId,
        userMessageId: data.userMessageId,
        assistantMessageId: data.assistantMessageId,
        prompt: data.prompt,
        provider: data.provider,
        model: data.model,
        width: data.width ?? 1024,
        height: data.height ?? 1024,
        quality: data.quality,
        style: data.style,
        status: 'QUEUED',
      },
      include: { assets: true },
    });
  }

  async findById(id: string): Promise<ImageGenerationRecord | null> {
    return this.prisma.imageGeneration.findUnique({
      where: { id },
      include: { assets: true },
    });
  }

  async findByUserId(
    userId: string,
    page: number,
    limit: number,
  ): Promise<ImageGenerationRecord[]> {
    return this.prisma.imageGeneration.findMany({
      where: { userId },
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: { assets: true },
    });
  }

  async countByUserId(userId: string): Promise<number> {
    return this.prisma.imageGeneration.count({ where: { userId } });
  }

  async updateStatus(
    id: string,
    status: ImageGenerationStatus,
    extra?: {
      errorCode?: string;
      errorMessage?: string;
      revisedPrompt?: string;
      startedAt?: Date;
      completedAt?: Date;
      latencyMs?: number;
    },
  ): Promise<ImageGenerationRecord> {
    return this.prisma.imageGeneration.update({
      where: { id },
      data: { status, ...extra },
      include: { assets: true },
    });
  }

  async createEvent(data: {
    generationId: string;
    status: ImageGenerationStatus;
    payloadJson?: Prisma.InputJsonValue;
  }): Promise<void> {
    await this.prisma.imageGenerationEvent.create({ data });
  }

  async createAsset(data: {
    generationId: string;
    storageKey: string;
    url: string;
    downloadUrl: string;
    mimeType: string;
    width?: number;
    height?: number;
    sizeBytes?: number;
  }): Promise<ImageGenerationAssetRecord> {
    return this.prisma.imageGenerationAsset.create({ data });
  }

  async findActiveByThreadId(threadId: string): Promise<ImageGenerationRecord[]> {
    return this.prisma.imageGeneration.findMany({
      where: {
        threadId,
        status: { in: ['QUEUED', 'STARTING', 'GENERATING', 'FINALIZING'] },
      },
      include: { assets: true },
      orderBy: { createdAt: 'asc' },
    });
  }
}
