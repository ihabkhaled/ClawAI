import { Injectable } from '@nestjs/common';
import { type FileFormat, type FileGenerationStatus, type Prisma } from '../../../generated/prisma';
import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import {
  type FileGenerationAssetRecord,
  type FileGenerationRecord,
} from '../types/file-generation.types';

@Injectable()
export class FileGenerationRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: {
    userId: string;
    threadId?: string;
    userMessageId?: string;
    assistantMessageId?: string;
    prompt: string;
    content: string;
    format: FileFormat;
    filename?: string;
    title?: string;
    description?: string;
    provider: string;
    model: string;
  }): Promise<FileGenerationRecord> {
    return this.prisma.fileGeneration.create({
      data: { ...data, status: 'QUEUED' },
      include: { assets: true },
    });
  }

  async findById(id: string): Promise<FileGenerationRecord | null> {
    return this.prisma.fileGeneration.findUnique({
      where: { id },
      include: { assets: true },
    });
  }

  async findByUserId(userId: string, page: number, limit: number): Promise<FileGenerationRecord[]> {
    return this.prisma.fileGeneration.findMany({
      where: { userId },
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: { assets: true },
    });
  }

  async countByUserId(userId: string): Promise<number> {
    return this.prisma.fileGeneration.count({ where: { userId } });
  }

  async updateStatus(
    id: string,
    status: FileGenerationStatus,
    extra?: {
      errorCode?: string;
      errorMessage?: string;
      content?: string;
      filename?: string;
      startedAt?: Date;
      completedAt?: Date;
      latencyMs?: number;
    },
  ): Promise<FileGenerationRecord> {
    return this.prisma.fileGeneration.update({
      where: { id },
      data: { status, ...extra },
      include: { assets: true },
    });
  }

  async createEvent(data: {
    generationId: string;
    status: FileGenerationStatus;
    payloadJson?: Prisma.InputJsonValue;
  }): Promise<void> {
    await this.prisma.fileGenerationEvent.create({ data });
  }

  async createAsset(
    data: Prisma.FileGenerationAssetUncheckedCreateInput,
  ): Promise<FileGenerationAssetRecord> {
    return this.prisma.fileGenerationAsset.create({ data });
  }

  async setAssetUrls(id: string, url: string): Promise<FileGenerationAssetRecord> {
    return this.prisma.fileGenerationAsset.update({
      where: { id },
      data: { url, downloadUrl: url },
    });
  }

  async findAsset(
    generationId: string,
    assetId: string,
  ): Promise<FileGenerationAssetRecord | null> {
    return this.prisma.fileGenerationAsset.findFirst({ where: { id: assetId, generationId } });
  }

  /** Assets whose time is up and whose bytes are still stored. */
  async findExpiredAssets(now: Date, take: number): Promise<FileGenerationAssetRecord[]> {
    return this.prisma.fileGenerationAsset.findMany({
      where: { expiresAt: { lte: now }, expiredAt: null },
      take,
      orderBy: { expiresAt: 'asc' },
    });
  }

  async markAssetExpired(id: string, now: Date): Promise<void> {
    await this.prisma.fileGenerationAsset.update({ where: { id }, data: { expiredAt: now } });
  }
}
