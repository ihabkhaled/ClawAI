import { Injectable } from '@nestjs/common';

import { VideoAssetRole, VideoGenerationStatus } from '../../../generated/prisma';
import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import {
  OUTPUT_ASSETS_INCLUDE,
  VIDEO_ACTIVE_STATUSES,
} from '../constants/video-generation.constants';
import type {
  CreateVideoGenerationData,
  VideoGenerationRecord,
  VideoStaleJobRecord,
} from '../types/video-generation.types';

@Injectable()
export class VideoGenerationRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateVideoGenerationData): Promise<VideoGenerationRecord> {
    return this.prisma.videoGeneration.create({ data, include: OUTPUT_ASSETS_INCLUDE });
  }

  /**
   * THE one place a row takes over from another: an AUTO fallback attempt or a
   * user's retry. One transaction creates the successor and points the
   * predecessor at it, so a reader following `supersededById` can never land on a
   * row that does not exist yet.
   */
  async createSuccessor(
    predecessorId: string,
    data: CreateVideoGenerationData,
  ): Promise<VideoGenerationRecord> {
    return this.prisma.$transaction(async (tx) => {
      const successor = await tx.videoGeneration.create({ data, include: OUTPUT_ASSETS_INCLUDE });
      await tx.videoGeneration.update({
        where: { id: predecessorId },
        data: { supersededById: successor.id },
      });
      return successor;
    });
  }

  async findById(id: string): Promise<VideoGenerationRecord | null> {
    return this.prisma.videoGeneration.findUnique({
      where: { id },
      include: OUTPUT_ASSETS_INCLUDE,
    });
  }

  /** STARTING, with the start time. Only while the row is still QUEUED. */
  async markStarting(id: string): Promise<boolean> {
    const result = await this.prisma.videoGeneration.updateMany({
      where: { id, status: VideoGenerationStatus.QUEUED },
      data: { status: VideoGenerationStatus.STARTING, startedAt: new Date() },
    });
    return result.count > 0;
  }

  /** Moves an ACTIVE row to `status`; a cancelled or finished row is never revived. */
  async advance(id: string, status: VideoGenerationStatus): Promise<boolean> {
    const result = await this.prisma.videoGeneration.updateMany({
      where: { id, status: { in: [...VIDEO_ACTIVE_STATUSES] } },
      data: { status },
    });
    return result.count > 0;
  }

  async setOperation(id: string, operationId: string): Promise<void> {
    await this.prisma.videoGeneration.update({
      where: { id },
      data: { providerOperationId: operationId, status: VideoGenerationStatus.GENERATING },
    });
  }

  async setReservation(id: string, reservationId: string): Promise<void> {
    await this.prisma.videoGeneration.update({
      where: { id },
      data: { paygReservationId: reservationId },
    });
  }

  async addOutputAsset(input: {
    generationId: string;
    storageKey: string;
    mimeType: string;
    sizeBytes: number;
    durationSeconds: number;
  }): Promise<void> {
    const downloadUrl = `/api/v1/files/download/${input.storageKey}`;
    await this.prisma.videoGenerationAsset.create({
      data: {
        generationId: input.generationId,
        storageKey: input.storageKey,
        url: downloadUrl,
        downloadUrl,
        mimeType: input.mimeType,
        sizeBytes: input.sizeBytes,
        durationSeconds: input.durationSeconds,
        role: VideoAssetRole.OUTPUT,
      },
    });
  }

  /** COMPLETED, but only while the row is still ACTIVE (a cancel wins the race). */
  async complete(id: string, latencyMs: number): Promise<boolean> {
    const result = await this.prisma.videoGeneration.updateMany({
      where: { id, status: { in: [...VIDEO_ACTIVE_STATUSES] } },
      data: {
        status: VideoGenerationStatus.COMPLETED,
        completedAt: new Date(),
        latencyMs,
        paygReservationId: null,
      },
    });
    return result.count > 0;
  }

  async fail(
    id: string,
    status: typeof VideoGenerationStatus.FAILED | typeof VideoGenerationStatus.TIMED_OUT,
    errorCode: string,
    errorMessage: string,
  ): Promise<boolean> {
    const result = await this.prisma.videoGeneration.updateMany({
      where: { id, status: { in: [...VIDEO_ACTIVE_STATUSES] } },
      data: { status, errorCode, errorMessage, completedAt: new Date(), paygReservationId: null },
    });
    return result.count > 0;
  }

  /** CANCELLED, only while ACTIVE. Returns whether this call cancelled it. */
  async cancelIfActive(id: string): Promise<boolean> {
    const result = await this.prisma.videoGeneration.updateMany({
      where: { id, status: { in: [...VIDEO_ACTIVE_STATUSES] } },
      data: { status: VideoGenerationStatus.CANCELLED, completedAt: new Date() },
    });
    return result.count > 0;
  }

  async isCancelled(id: string): Promise<boolean> {
    const row = await this.prisma.videoGeneration.findUnique({
      where: { id },
      select: { status: true },
    });
    return row?.status === VideoGenerationStatus.CANCELLED;
  }

  async linkAssistantMessage(
    id: string,
    userId: string,
    assistantMessageId: string,
  ): Promise<number> {
    const result = await this.prisma.videoGeneration.updateMany({
      where: { id, userId },
      data: { assistantMessageId },
    });
    return result.count;
  }

  /** TIMED_OUT, only while still ACTIVE and untouched since `cutoff` (a live write wins). */
  async timeOutIfStale(
    id: string,
    cutoff: Date,
    failure: { errorCode: string; errorMessage: string },
  ): Promise<boolean> {
    const result = await this.prisma.videoGeneration.updateMany({
      where: { id, status: { in: [...VIDEO_ACTIVE_STATUSES] }, updatedAt: { lt: cutoff } },
      data: {
        status: VideoGenerationStatus.TIMED_OUT,
        errorCode: failure.errorCode,
        errorMessage: failure.errorMessage,
        completedAt: new Date(),
        paygReservationId: null,
      },
    });
    return result.count > 0;
  }

  async findStale(updatedBefore: Date): Promise<VideoStaleJobRecord[]> {
    return this.prisma.videoGeneration.findMany({
      where: { status: { in: [...VIDEO_ACTIVE_STATUSES] }, updatedAt: { lt: updatedBefore } },
      select: { id: true, paygReservationId: true },
      take: 100,
    });
  }
}
