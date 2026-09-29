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
import { type ImageStaleJobRecord } from '../types/image-stale-recovery.types';
import { IMAGE_STALE_JOB_SELECT } from '../constants/image-stale-recovery.constants';

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
      // The reference AND its mask travel together: an edit retried without
      // its mask would change pixels the user had protected.
      const inputs = await tx.imageGenerationAsset.findMany({
        where: {
          generationId: predecessorId,
          role: { in: [ImageAssetRole.REFERENCE, ImageAssetRole.MASK] },
        },
      });
      for (const input of inputs) {
        await tx.imageGenerationAsset.create({
          data: {
            generationId: successor.id,
            role: input.role,
            storageKey: input.storageKey,
            url: input.url,
            downloadUrl: input.downloadUrl,
            mimeType: input.mimeType,
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

  /**
   * Records the PAYG hold the running attempt just took, so the stale-job
   * recovery can release it if this process dies before settling. Written only
   * while the row is still running; a row that already finished keeps its state.
   */
  async recordPaygReservation(id: string, reservationId: string): Promise<void> {
    await this.prisma.imageGeneration.updateMany({
      where: { id, status: { in: [...IMAGE_ACTIVE_STATUSES] } },
      data: { paygReservationId: reservationId },
    });
  }

  /**
   * Running rows nobody has written since `cutoff` — the candidates the
   * stale-job recovery times out. Oldest first, bounded by `limit`.
   */
  async findStaleActive(cutoff: Date, limit: number): Promise<ImageStaleJobRecord[]> {
    return this.prisma.imageGeneration.findMany({
      where: { status: { in: [...IMAGE_ACTIVE_STATUSES] }, updatedAt: { lt: cutoff } },
      select: IMAGE_STALE_JOB_SELECT,
      orderBy: { updatedAt: 'asc' },
      take: limit,
    });
  }

  /**
   * THE stale-job write: TIMED_OUT only while the row is STILL running and
   * STILL untouched since `cutoff`. One conditional statement, so a live
   * completion, failure or cancel that lands first wins and this is a no-op
   * (null). Returns the timed-out row.
   */
  async timeOutIfStale(
    id: string,
    cutoff: Date,
    failure: { errorCode: string; errorMessage: string },
  ): Promise<ImageGenerationRecord | null> {
    const { count } = await this.prisma.imageGeneration.updateMany({
      where: { id, status: { in: [...IMAGE_ACTIVE_STATUSES] }, updatedAt: { lt: cutoff } },
      data: {
        status: ImageGenerationStatus.TIMED_OUT,
        errorCode: failure.errorCode,
        errorMessage: failure.errorMessage,
        completedAt: new Date(),
      },
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
        role: input.role ?? ImageAssetRole.REFERENCE,
        storageKey: input.fileId,
        url,
        downloadUrl: url,
        mimeType: input.mimeType,
      },
    });
  }

  /**
   * Sets `assistantMessageId` on the owner's row only while it is unset, so a
   * late or repeated link can never overwrite the first one. Returns 0 or 1.
   */
  async setAssistantMessageIfUnset(
    id: string,
    userId: string,
    assistantMessageId: string,
  ): Promise<number> {
    const result = await this.prisma.imageGeneration.updateMany({
      where: { id, userId, assistantMessageId: null },
      data: { assistantMessageId },
    });
    return result.count;
  }

  async findReferenceAsset(generationId: string): Promise<ImageGenerationAssetRecord | null> {
    return this.prisma.imageGenerationAsset.findFirst({
      where: { generationId, role: ImageAssetRole.REFERENCE },
    });
  }

  async findMaskAsset(generationId: string): Promise<ImageGenerationAssetRecord | null> {
    return this.prisma.imageGenerationAsset.findFirst({
      where: { generationId, role: ImageAssetRole.MASK },
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
      originalPrompt: data.originalPrompt,
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
