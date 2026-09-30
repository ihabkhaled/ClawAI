import { HttpStatus, Injectable, Logger } from '@nestjs/common';

import { VIDEO_FALLBACK_CHAIN, VIDEO_PROVIDER_CONNECTORS } from '../../../common/constants';
import { VideoFailureCode } from '../../../common/enums';
import { BusinessException, EntityNotFoundException } from '../../../common/errors';
import { VideoGenerationStatus } from '../../../generated/prisma';
import { ImagePlanGateManager } from '../../image-generation/managers/image-plan-gate.manager';
import { type GenerateVideoDto } from '../dto/generate-video.dto';
import {
  NO_FALLBACK_CODES,
  VIDEO_CHAIN_MAX_HOPS,
  VIDEO_CREDIT_FAILURE_MESSAGE,
} from '../constants/video-generation.constants';
import { videoFailureMessage } from '../constants/video-failure.constants';
import { VideoExecutionManager } from '../managers/video-execution.manager';
import { VideoGenerationRepository } from '../repositories/video-generation.repository';
import type {
  CreateVideoGenerationData,
  VideoGenerationRecord,
  VideoGenerationWithLatest,
} from '../types/video-generation.types';
import { isVideoCancelledError } from '../utilities/video-cancel.utility';
import { videoFailureCodeOf } from '../utilities/video-provider-error.utility';
import { toVideoView } from '../utilities/video-view.utility';

@Injectable()
export class VideoGenerationService {
  private readonly logger = new Logger(VideoGenerationService.name);

  constructor(
    private readonly repository: VideoGenerationRepository,
    private readonly execution: VideoExecutionManager,
    private readonly planGate: ImagePlanGateManager,
  ) {}

  /**
   * Accepts a video request and returns at once: the job runs in the background
   * and the caller polls. The plan gate runs before a row is written, before any
   * PAYG hold and before any provider is dialled (the media features gate).
   */
  async enqueueGeneration(dto: GenerateVideoDto): Promise<VideoGenerationRecord> {
    if (!VIDEO_PROVIDER_CONNECTORS.has(dto.provider)) {
      throw new BusinessException(
        `Unsupported video provider: ${dto.provider}`,
        'UNSUPPORTED_VIDEO_PROVIDER',
        HttpStatus.BAD_REQUEST,
      );
    }
    await this.planGate.assertCanGenerate(dto.userId);
    const row = await this.repository.create({
      userId: dto.userId,
      threadId: dto.threadId ?? null,
      userMessageId: dto.userMessageId ?? null,
      assistantMessageId: dto.assistantMessageId ?? null,
      prompt: dto.prompt,
      originalPrompt: dto.originalPrompt ?? null,
      provider: dto.provider,
      model: dto.model,
      durationSeconds: dto.durationSeconds,
      aspectRatio: dto.aspectRatio,
      isAutoMode: dto.isAutoMode,
    });
    this.logger.log(
      `enqueueGeneration: id=${row.id} provider=${row.provider} model=${row.model} seconds=${String(row.durationSeconds)} auto=${String(row.isAutoMode)}`,
    );
    this.runInBackground(row);
    return row;
  }

  async getById(id: string): Promise<ReturnType<typeof toVideoView>> {
    const row = await this.repository.findById(id);
    if (row === null) {
      throw new EntityNotFoundException('Video generation', id);
    }
    return toVideoView(row);
  }

  /** Owner only. A stranger gets the same 404 as a missing id. */
  async getWithLatestForUser(id: string, userId: string): Promise<VideoGenerationWithLatest> {
    const row = await this.requireOwned(id, userId);
    let head = row;
    for (let hop = 0; hop < VIDEO_CHAIN_MAX_HOPS && head.supersededById !== null; hop += 1) {
      const next = await this.repository.findById(head.supersededById);
      if (next?.userId !== userId) {
        break;
      }
      head = next;
    }
    return { ...toVideoView(row), latest: toVideoView(head) };
  }

  /** Idempotent: 200 with the row's status after the call. */
  async cancelGenerationForUser(
    id: string,
    userId: string,
  ): Promise<{ id: string; status: VideoGenerationStatus; cancelled: boolean }> {
    await this.requireOwned(id, userId);
    const cancelled = await this.repository.cancelIfActive(id);
    const fresh = await this.requireOwned(id, userId);
    this.logger.log(
      `cancelGeneration: id=${id} cancelled=${String(cancelled)} status=${fresh.status}`,
    );
    return { id, status: fresh.status, cancelled };
  }

  /** Re-runs a failed, timed-out or cancelled generation as a successor row. */
  async retryGenerationForUser(id: string, userId: string): Promise<VideoGenerationRecord> {
    const row = await this.requireOwned(id, userId);
    const retryable: VideoGenerationStatus[] = [
      VideoGenerationStatus.FAILED,
      VideoGenerationStatus.TIMED_OUT,
      VideoGenerationStatus.CANCELLED,
    ];
    if (!retryable.includes(row.status) || row.supersededById !== null) {
      throw new BusinessException(
        'Only the latest failed or cancelled video can be retried',
        'VIDEO_NOT_RETRYABLE',
        HttpStatus.CONFLICT,
      );
    }
    await this.planGate.assertCanGenerate(userId);
    const successor = await this.repository.createSuccessor(
      row.id,
      this.copyOf(row, row.isAutoMode),
    );
    this.runInBackground(successor);
    return successor;
  }

  async linkAssistantMessage(
    id: string,
    userId: string,
    assistantMessageId: string,
  ): Promise<number> {
    return this.repository.linkAssistantMessage(id, userId, assistantMessageId);
  }

  private async requireOwned(id: string, userId: string): Promise<VideoGenerationRecord> {
    const row = await this.repository.findById(id);
    if (row?.userId !== userId) {
      throw new EntityNotFoundException('Video generation', id);
    }
    return row;
  }

  private copyOf(row: VideoGenerationRecord, isAutoMode: boolean): CreateVideoGenerationData {
    return {
      userId: row.userId,
      threadId: row.threadId,
      userMessageId: row.userMessageId,
      assistantMessageId: row.assistantMessageId,
      prompt: row.prompt,
      originalPrompt: row.originalPrompt,
      provider: row.provider,
      model: row.model,
      durationSeconds: row.durationSeconds,
      aspectRatio: row.aspectRatio,
      isAutoMode,
    };
  }

  /**
   * Fire-and-forget with a catch: an unhandled rejection in a background job would
   * take the whole process down, and every other user's job with it. Anything that
   * escapes `processJob` is logged and the row is failed so its spinner ends.
   */
  private runInBackground(row: VideoGenerationRecord): void {
    this.processWithFallback(row).catch((error: unknown) => {
      const detail = error instanceof Error ? error.message : 'unknown error';
      this.logger.error(`runInBackground: id=${row.id} escaped the job — ${detail}`);
      void this.repository
        .fail(
          row.id,
          'FAILED',
          VideoFailureCode.PROVIDER_FAILURE,
          videoFailureMessage(VideoFailureCode.PROVIDER_FAILURE),
        )
        .catch(() => null);
    });
  }

  /** Runs one attempt; an AUTO request that fails falls through to the next provider. */
  private async processWithFallback(row: VideoGenerationRecord): Promise<void> {
    const failure = await this.processJob(row);
    if (failure === null || !row.isAutoMode) {
      return;
    }
    const next = this.nextCandidate(row.provider, failure.code);
    if (next === null) {
      return;
    }
    this.logger.warn(
      `processWithFallback: id=${row.id} ${row.provider} failed (${failure.code}) — trying ${next.provider}`,
    );
    const successor = await this.repository.createSuccessor(row.id, {
      ...this.copyOf(row, true),
      provider: next.provider,
      model: next.model,
    });
    await this.processWithFallback(successor);
  }

  private nextCandidate(
    provider: string,
    code: string,
  ): { provider: string; model: string } | null {
    if (code === 'PAYG_CREDIT' || NO_FALLBACK_CODES.includes(code)) {
      return null;
    }
    const index = VIDEO_FALLBACK_CHAIN.findIndex((entry) => entry.provider === provider);
    return index < 0 ? null : (VIDEO_FALLBACK_CHAIN.at(index + 1) ?? null);
  }

  /** One attempt. Returns the stored failure, or null on success or a user cancel. */
  private async processJob(row: VideoGenerationRecord): Promise<{ code: string } | null> {
    if (!(await this.repository.markStarting(row.id))) {
      return null;
    }
    try {
      const result = await this.execution.execute({
        generationId: row.id,
        requestId: `video:${row.id}`,
        userId: row.userId,
        provider: row.provider,
        model: row.model,
        prompt: row.prompt,
        durationSeconds: row.durationSeconds,
        aspectRatio: row.aspectRatio,
        isCancelled: () => this.repository.isCancelled(row.id),
        onOperation: (operationId) => this.repository.setOperation(row.id, operationId),
        onHoldReserved: (reservationId) => this.repository.setReservation(row.id, reservationId),
      });
      await this.repository.advance(row.id, VideoGenerationStatus.FINALIZING);
      await this.repository.addOutputAsset({
        generationId: row.id,
        storageKey: result.fileId,
        mimeType: result.mimeType,
        sizeBytes: result.sizeBytes,
        durationSeconds: result.durationSeconds,
      });
      const completed = await this.repository.complete(row.id, result.latencyMs);
      if (!completed) {
        // A cancel won the race after the clip was stored: the user did not receive it.
        await this.execution.releaseUnpersisted(result.settlement);
        return null;
      }
      await this.execution.settle(result.settlement);
      this.logger.log(`processJob: id=${row.id} COMPLETED fileId=${result.fileId}`);
      return null;
    } catch (error: unknown) {
      return isVideoCancelledError(error) ? null : this.recordFailure(row, error);
    }
  }

  private async recordFailure(
    row: VideoGenerationRecord,
    error: unknown,
  ): Promise<{ code: string }> {
    const code = videoFailureCodeOf(error);
    const isCredit =
      error instanceof BusinessException && error.getStatus() === HttpStatus.PAYMENT_REQUIRED;
    const known = Object.values(VideoFailureCode).find((value) => value === code);
    const message = isCredit
      ? VIDEO_CREDIT_FAILURE_MESSAGE
      : videoFailureMessage(known ?? VideoFailureCode.PROVIDER_FAILURE);
    const detail = error instanceof Error ? error.message : 'unknown error';
    this.logger.error(
      `processJob: id=${row.id} provider=${row.provider} FAILED code=${code} — ${detail}`,
    );
    await this.repository.fail(
      row.id,
      code === VideoFailureCode.GENERATION_TIMED_OUT ? 'TIMED_OUT' : 'FAILED',
      code,
      message,
    );
    return { code: isCredit ? 'PAYG_CREDIT' : code };
  }
}
