import { Injectable } from '@nestjs/common';
import { ImageAssetRole, ImageGenerationStatus, type Prisma } from '../../../generated/prisma';
import { IMAGE_ACTIVE_STATUSES } from '../constants/image-cancel.constants';
import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import { IMAGE_OUTPUT_ASSETS_INCLUDE } from '../constants/image-supersession.constants';
import {
  type CreateImageGenerationData,
  type ImageGenerationAssetRecord,
  type ImageGenerationRecord,
  type ImageReferenceAssetInput,
} from '../types/image-generation.types';

@Injectable()
export class ImageGenerationRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateImageGenerationData): Promise<ImageGenerationRecord> {
    return this.prisma.imageGeneration.create({
      data: this.toCreateInput(data),
      include: IMAGE_OUTPUT_ASSETS_INCLUDE,
    });
  }

  /**
   * THE one place a row takes over from another: an AUTO fallback attempt or
   * a user's retry-alternate.
   *
   * One transaction creates the successor, points the predecessor at it and
   * carries the stored reference image across, so a reader following
   * `supersededById` can never land on a row that does not exist yet, and a
   * retry of the successor still has the image it was asked to edit.
   */
  async createSuccessor(
    predecessorId: string,
    data: CreateImageGenerationData,
  ): Promise<ImageGenerationRecord> {
    return this.prisma.$transaction(async (tx) => {
      const successor = await tx.imageGeneration.create({
        data: this.toCreateInput(data),
        include: IMAGE_OUTPUT_ASSETS_INCLUDE,
      });
      await tx.imageGeneration.update({
        where: { id: predecessorId },
        data: { supersededById: successor.id },
      });
      const reference = await tx.imageGenerationAsset.findFirst({
        where: { generationId: predecessorId, role: ImageAssetRole.REFERENCE },
      });
      if (reference) {
        await tx.imageGenerationAsset.create({
          data: {
            generationId: successor.id,
            role: ImageAssetRole.REFERENCE,
            storageKey: reference.storageKey,
            url: reference.url,
            downloadUrl: reference.downloadUrl,
            mimeType: reference.mimeType,
          },
        });
      }
      return successor;
    });
  }

  async findById(id: string): Promise<ImageGenerationRecord | null> {
    return this.prisma.imageGeneration.findUnique({
      where: { id },
      include: IMAGE_OUTPUT_ASSETS_INCLUDE,
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
      include: IMAGE_OUTPUT_ASSETS_INCLUDE,
    });
  }

  async countByUserId(userId: string): Promise<number> {
    return this.prisma.imageGeneration.count({ where: { userId } });
  }

  /**
   * Moves a row to `status` — unless the user CANCELLED it. CANCELLED is
   * absorbing: the conditional `updateMany` never matches a cancelled row, so a
   * provider call that returns after the cancel cannot overwrite it with
   * FINALIZING / COMPLETED / FAILED, on this replica or any other. Returns null
   * when nothing was written (cancelled or missing). A retry of a CANCELLED
   * row goes to a successor row, never back through here.
   */
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
  ): Promise<ImageGenerationRecord | null> {
    const { count } = await this.prisma.imageGeneration.updateMany({
      where: { id, status: { not: ImageGenerationStatus.CANCELLED } },
      data: { status, ...extra },
    });
    return count === 0 ? null : this.findById(id);
  }

  /**
   * THE cancel write: CANCELLED only while the row is still running
   * (`IMAGE_ACTIVE_STATUSES`). One conditional statement, so of a cancel and a
   * completion racing on two replicas exactly one wins. Returns the cancelled
   * row, or null when it had already finished (or does not exist).
   */
  async cancelIfActive(id: string): Promise<ImageGenerationRecord | null> {
    const { count } = await this.prisma.imageGeneration.updateMany({
      where: { id, status: { in: [...IMAGE_ACTIVE_STATUSES] } },
      data: { status: ImageGenerationStatus.CANCELLED, completedAt: new Date() },
    });
    return count === 0 ? null : this.findById(id);
  }

  /** Current status only — the cheap read the execution path polls for a cancel. */
  async findStatus(id: string): Promise<ImageGenerationStatus | null> {
    const row = await this.prisma.imageGeneration.findUnique({
      where: { id },
      select: { status: true },
    });
    return row?.status ?? null;
  }

  /** Removes an OUTPUT asset written just before the row was found CANCELLED. */
  async deleteAsset(id: string): Promise<void> {
    await this.prisma.imageGenerationAsset.deleteMany({ where: { id } });
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
    return this.prisma.imageGenerationAsset.create({
      data: { ...data, role: ImageAssetRole.OUTPUT },
    });
  }

  /** Stores the user's reference image as a file-service id — never the bytes. */
  async createReferenceAsset(input: ImageReferenceAssetInput): Promise<ImageGenerationAssetRecord> {
    const url = `/api/v1/files/download/${input.fileId}`;
    return this.prisma.imageGenerationAsset.create({
      data: {
        generationId: input.generationId,
        role: ImageAssetRole.REFERENCE,
        storageKey: input.fileId,
        url,
        downloadUrl: url,
        mimeType: input.mimeType,
      },
    });
  }

  async findReferenceAsset(generationId: string): Promise<ImageGenerationAssetRecord | null> {
    return this.prisma.imageGenerationAsset.findFirst({
      where: { generationId, role: ImageAssetRole.REFERENCE },
    });
  }

  async findActiveByThreadId(threadId: string): Promise<ImageGenerationRecord[]> {
    return this.prisma.imageGeneration.findMany({
      where: {
        threadId,
        status: { in: ['QUEUED', 'STARTING', 'GENERATING', 'FINALIZING'] },
      },
      include: IMAGE_OUTPUT_ASSETS_INCLUDE,
      orderBy: { createdAt: 'asc' },
    });
  }

  private toCreateInput(data: CreateImageGenerationData): Prisma.ImageGenerationCreateInput {
    return {
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
    };
  }
}
