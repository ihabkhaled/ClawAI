import { resolveTtsVoice } from '@claw/shared-constants';
import { HttpStatus, Injectable, Logger } from '@nestjs/common';

import { AUDIO_DEFAULT_MODELS, AUDIO_PROVIDER_CONNECTORS } from '../../../common/constants';
import { AudioFailureCode } from '../../../common/enums';
import { BusinessException, EntityNotFoundException } from '../../../common/errors';
import { AudioGenerationStatus, AudioKind } from '../../../generated/prisma';
import { ImagePlanGateManager } from '../../image-generation/managers/image-plan-gate.manager';
import { type GenerateAudioDto } from '../dto/generate-audio.dto';
import { audioFailureMessage } from '../constants/audio-failure.constants';
import {
  AUDIO_CHAIN_MAX_HOPS,
  AUDIO_CREDIT_FAILURE_MESSAGE,
  AUDIO_DEFAULT_FORMAT,
} from '../constants/audio-generation.constants';
import { AudioExecutionManager } from '../managers/audio-execution.manager';
import { AudioGenerationRepository } from '../repositories/audio-generation.repository';
import type {
  AudioGenerationRecord,
  AudioGenerationView,
  AudioGenerationWithLatest,
  AudioInternalView,
  CreateAudioGenerationData,
} from '../types/audio-generation.types';
import { isAudioCancelledError } from '../utilities/audio-cancel.utility';
import { audioFailureCodeOf } from '../utilities/audio-provider-error.utility';
import { toAudioInternalView, toAudioView } from '../utilities/audio-view.utility';

@Injectable()
export class AudioGenerationService {
  private readonly logger = new Logger(AudioGenerationService.name);

  constructor(
    private readonly repository: AudioGenerationRepository,
    private readonly execution: AudioExecutionManager,
    private readonly planGate: ImagePlanGateManager,
  ) {}

  /**
   * Accepts an audio request and returns at once: the job runs in the background and
   * the caller polls. The plan gate runs before a row is written, before any PAYG hold
   * and before any provider is dialled (the media features gate, ADR-122).
   */
  async enqueueGeneration(dto: GenerateAudioDto): Promise<AudioGenerationRecord> {
    const kind = dto.kind === 'MUSIC' ? AudioKind.MUSIC : AudioKind.SPEECH;
    const model = dto.model ?? AUDIO_DEFAULT_MODELS.get(`${kind}:${dto.provider}`);
    if (!AUDIO_PROVIDER_CONNECTORS.has(dto.provider) || model === undefined) {
      throw new BusinessException(
        `Unsupported audio provider for ${kind}: ${dto.provider}`,
        'UNSUPPORTED_AUDIO_PROVIDER',
        HttpStatus.BAD_REQUEST,
      );
    }
    await this.planGate.assertCanGenerate(dto.userId);
    const row = await this.repository.create(this.toCreateData(dto, kind, model));
    this.logger.log(
      `enqueueGeneration: id=${row.id} kind=${row.kind} provider=${row.provider} model=${row.model} characters=${String(row.prompt.length)}`,
    );
    this.runInBackground(row);
    return row;
  }

  private toCreateData(
    dto: GenerateAudioDto,
    kind: AudioKind,
    model: string,
  ): CreateAudioGenerationData {
    // A model-written voice like "calm" is not a provider voice; the provider's default speaks.
    const connector = AUDIO_PROVIDER_CONNECTORS.get(dto.provider);
    const voice =
      connector === undefined ? null : (resolveTtsVoice(connector, dto.voice ?? null) ?? null);
    return {
      userId: dto.userId,
      workspaceId: dto.workspaceId ?? null,
      threadId: dto.threadId ?? null,
      messageId: dto.messageId ?? null,
      kind,
      prompt: dto.prompt,
      provider: dto.provider,
      model,
      voice: kind === AudioKind.SPEECH ? voice : null,
      format: dto.format ?? AUDIO_DEFAULT_FORMAT,
    };
  }

  /** The service-to-service view chat-service polls. */
  async getInternalById(id: string): Promise<AudioInternalView> {
    const row = await this.repository.findById(id);
    if (row === null) {
      throw new EntityNotFoundException('Audio generation', id);
    }
    return toAudioInternalView(row);
  }

  /** Owner only; carries `latest`, the head of the retry chain. A stranger gets the 404. */
  async getWithLatestForUser(id: string, userId: string): Promise<AudioGenerationWithLatest> {
    const row = await this.requireOwned(id, userId);
    let head = row;
    for (let hop = 0; hop < AUDIO_CHAIN_MAX_HOPS && head.supersededById !== null; hop += 1) {
      const next = await this.repository.findById(head.supersededById);
      if (next?.userId !== userId) {
        break;
      }
      head = next;
    }
    const latest: AudioGenerationView = toAudioView(head);
    return { ...toAudioView(row), latest };
  }

  /** Idempotent: 200 with the row's status after the call. */
  async cancelGenerationForUser(
    id: string,
    userId: string,
  ): Promise<{ id: string; status: AudioGenerationStatus; cancelled: boolean }> {
    await this.requireOwned(id, userId);
    const cancelled = await this.repository.cancelIfActive(id);
    const fresh = await this.requireOwned(id, userId);
    this.logger.log(
      `cancelGeneration: id=${id} cancelled=${String(cancelled)} status=${fresh.status}`,
    );
    return { id, status: fresh.status, cancelled };
  }

  /** Re-runs a failed, timed-out or cancelled generation as a successor row. */
  async retryGenerationForUser(id: string, userId: string): Promise<AudioGenerationRecord> {
    const row = await this.requireOwned(id, userId);
    const retryable: AudioGenerationStatus[] = [
      AudioGenerationStatus.FAILED,
      AudioGenerationStatus.TIMED_OUT,
      AudioGenerationStatus.CANCELLED,
    ];
    if (!retryable.includes(row.status) || row.supersededById !== null) {
      throw new BusinessException(
        'Only the latest failed or cancelled audio can be retried',
        'AUDIO_NOT_RETRYABLE',
        HttpStatus.CONFLICT,
      );
    }
    await this.planGate.assertCanGenerate(userId);
    const successor = await this.repository.createSuccessor(row.id, this.copyOf(row));
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

  private async requireOwned(id: string, userId: string): Promise<AudioGenerationRecord> {
    const row = await this.repository.findById(id);
    if (row?.userId !== userId) {
      throw new EntityNotFoundException('Audio generation', id);
    }
    return row;
  }

  private copyOf(row: AudioGenerationRecord): CreateAudioGenerationData {
    return {
      userId: row.userId,
      workspaceId: row.workspaceId,
      threadId: row.threadId,
      messageId: row.messageId,
      kind: row.kind,
      prompt: row.prompt,
      provider: row.provider,
      model: row.model,
      voice: row.voice,
      format: row.format,
    };
  }

  /**
   * Fire-and-forget with a catch: an unhandled rejection in a background job would take
   * the whole process down, and every other user's job with it. Anything that escapes
   * `processJob` is logged and the row is failed so its spinner ends.
   */
  private runInBackground(row: AudioGenerationRecord): void {
    this.processJob(row).catch((error: unknown) => {
      const detail = error instanceof Error ? error.message : 'unknown error';
      this.logger.error(`runInBackground: id=${row.id} escaped the job — ${detail}`);
      void this.repository
        .fail(
          row.id,
          AudioGenerationStatus.FAILED,
          AudioFailureCode.PROVIDER_FAILURE,
          audioFailureMessage(AudioFailureCode.PROVIDER_FAILURE),
        )
        .catch(() => null);
    });
  }

  /** One attempt. */
  private async processJob(row: AudioGenerationRecord): Promise<void> {
    if (!(await this.repository.markRunning(row.id))) {
      return;
    }
    try {
      const result = await this.execution.execute({
        generationId: row.id,
        requestId: `audio:${row.id}`,
        userId: row.userId,
        kind: row.kind,
        provider: row.provider,
        model: row.model,
        prompt: row.prompt,
        voice: row.voice ?? '',
        format: row.format,
        isCancelled: () => this.repository.isCancelled(row.id),
        onHoldReserved: (reservationId) => this.repository.setReservation(row.id, reservationId),
      });
      await this.repository.addOutputAsset({
        generationId: row.id,
        storageKey: result.fileId,
        mimeType: result.mimeType,
        sizeBytes: result.sizeBytes,
        durationSeconds: result.durationSeconds,
      });
      const completed = await this.repository.complete(row.id, result.latencyMs);
      if (!completed) {
        // A cancel won the race after the audio was stored: the user did not receive it.
        await this.execution.releaseUnpersisted(result.settlement);
        return;
      }
      await this.execution.settle(result.settlement);
      this.logger.log(`processJob: id=${row.id} COMPLETED fileId=${result.fileId}`);
    } catch (error: unknown) {
      if (!isAudioCancelledError(error)) {
        await this.recordFailure(row, error);
      }
    }
  }

  private async recordFailure(row: AudioGenerationRecord, error: unknown): Promise<void> {
    const code = audioFailureCodeOf(error);
    const isCredit =
      error instanceof BusinessException && error.getStatus() === HttpStatus.PAYMENT_REQUIRED;
    const known = Object.values(AudioFailureCode).find((value) => value === code);
    const message = isCredit
      ? AUDIO_CREDIT_FAILURE_MESSAGE
      : audioFailureMessage(known ?? AudioFailureCode.PROVIDER_FAILURE);
    const detail = error instanceof Error ? error.message : 'unknown error';
    this.logger.error(
      `processJob: id=${row.id} provider=${row.provider} FAILED code=${code} — ${detail}`,
    );
    await this.repository.fail(
      row.id,
      code === AudioFailureCode.GENERATION_TIMED_OUT
        ? AudioGenerationStatus.TIMED_OUT
        : AudioGenerationStatus.FAILED,
      code,
      message,
    );
  }
}
