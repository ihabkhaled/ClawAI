import { Injectable } from '@nestjs/common';

import { AudioGenerationStatus } from '../../../generated/prisma';
import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import {
  AUDIO_ACTIVE_STATUSES,
  AUDIO_ASSETS_INCLUDE,
} from '../constants/audio-generation.constants';
import type {
  AudioGenerationRecord,
  AudioStaleJobRecord,
  CreateAudioGenerationData,
} from '../types/audio-generation.types';

@Injectable()
export class AudioGenerationRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateAudioGenerationData): Promise<AudioGenerationRecord> {
    return this.prisma.audioGeneration.create({ data, include: AUDIO_ASSETS_INCLUDE });
  }

  /**
   * THE one place a row takes over from another (a user's retry). One transaction
   * creates the successor and points the predecessor at it, so a reader following
   * `supersededById` can never land on a row that does not exist yet.
   */
  async createSuccessor(
    predecessorId: string,
    data: CreateAudioGenerationData,
  ): Promise<AudioGenerationRecord> {
    return this.prisma.$transaction(async (tx) => {
      const successor = await tx.audioGeneration.create({ data, include: AUDIO_ASSETS_INCLUDE });
      await tx.audioGeneration.update({
        where: { id: predecessorId },
        data: { supersededById: successor.id },
      });
      return successor;
    });
  }

  async findById(id: string): Promise<AudioGenerationRecord | null> {
    return this.prisma.audioGeneration.findUnique({
      where: { id },
      include: AUDIO_ASSETS_INCLUDE,
    });
  }

  /** RUNNING, with the start time. Only while the row is still QUEUED. */
  async markRunning(id: string): Promise<boolean> {
    const result = await this.prisma.audioGeneration.updateMany({
      where: { id, status: AudioGenerationStatus.QUEUED },
      data: { status: AudioGenerationStatus.RUNNING, startedAt: new Date() },
    });
    return result.count > 0;
  }

  async setReservation(id: string, reservationId: string): Promise<void> {
    await this.prisma.audioGeneration.update({
      where: { id },
      data: { paygReservationId: reservationId },
    });
  }

  async addOutputAsset(input: {
    generationId: string;
    storageKey: string;
    mimeType: string;
    sizeBytes: number;
    durationSeconds: number | null;
  }): Promise<void> {
    const downloadUrl = `/api/v1/files/download/${input.storageKey}`;
    await this.prisma.audioGenerationAsset.create({
      data: {
        generationId: input.generationId,
        storageKey: input.storageKey,
        url: downloadUrl,
        downloadUrl,
        mimeType: input.mimeType,
        sizeBytes: input.sizeBytes,
        durationSeconds: input.durationSeconds,
      },
    });
  }

  /** COMPLETED, but only while the row is still ACTIVE (a cancel wins the race). */
  async complete(id: string, latencyMs: number): Promise<boolean> {
    const result = await this.prisma.audioGeneration.updateMany({
      where: { id, status: { in: [...AUDIO_ACTIVE_STATUSES] } },
      data: {
        status: AudioGenerationStatus.COMPLETED,
        completedAt: new Date(),
        latencyMs,
        paygReservationId: null,
      },
    });
    return result.count > 0;
  }

  async fail(
    id: string,
    status: typeof AudioGenerationStatus.FAILED | typeof AudioGenerationStatus.TIMED_OUT,
    errorCode: string,
    errorMessage: string,
  ): Promise<boolean> {
    const result = await this.prisma.audioGeneration.updateMany({
      where: { id, status: { in: [...AUDIO_ACTIVE_STATUSES] } },
      data: { status, errorCode, errorMessage, completedAt: new Date(), paygReservationId: null },
    });
    return result.count > 0;
  }

  /** CANCELLED, only while ACTIVE. Returns whether this call cancelled it. */
  async cancelIfActive(id: string): Promise<boolean> {
    const result = await this.prisma.audioGeneration.updateMany({
      where: { id, status: { in: [...AUDIO_ACTIVE_STATUSES] } },
      data: { status: AudioGenerationStatus.CANCELLED, completedAt: new Date() },
    });
    return result.count > 0;
  }

  async isCancelled(id: string): Promise<boolean> {
    const row = await this.prisma.audioGeneration.findUnique({
      where: { id },
      select: { status: true },
    });
    return row?.status === AudioGenerationStatus.CANCELLED;
  }

  async linkAssistantMessage(
    id: string,
    userId: string,
    assistantMessageId: string,
  ): Promise<number> {
    const result = await this.prisma.audioGeneration.updateMany({
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
    const result = await this.prisma.audioGeneration.updateMany({
      where: { id, status: { in: [...AUDIO_ACTIVE_STATUSES] }, updatedAt: { lt: cutoff } },
      data: {
        status: AudioGenerationStatus.TIMED_OUT,
        errorCode: failure.errorCode,
        errorMessage: failure.errorMessage,
        completedAt: new Date(),
        paygReservationId: null,
      },
    });
    return result.count > 0;
  }

  async findStale(updatedBefore: Date): Promise<AudioStaleJobRecord[]> {
    return this.prisma.audioGeneration.findMany({
      where: { status: { in: [...AUDIO_ACTIVE_STATUSES] }, updatedAt: { lt: updatedBefore } },
      select: { id: true, paygReservationId: true },
      take: 100,
    });
  }
}
