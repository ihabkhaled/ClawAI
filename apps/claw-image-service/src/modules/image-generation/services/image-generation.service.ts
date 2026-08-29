import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { RabbitMQService } from '@claw/shared-rabbitmq';
import { ImageGenerationStatus } from '../../../generated/prisma';
import { ImageGenerationRepository } from '../repositories/image-generation.repository';
import { ImageExecutionManager } from '../managers/image-execution.manager';
import { ImageGenerationEventsService } from './image-generation-events.service';
import {
  type GenerateImageParams,
  type ImageFailureDescription,
  type ImageGenerationRecord,
  TERMINAL_STATUSES,
} from '../types/image-generation.types';
import { describeImageFailure, isCreditFailureCode } from '../utilities/image-failure.utility';
import { type ListImagesQueryDto } from '../dto/generate-image.dto';
import { BusinessException } from '../../../common/errors';
import { IMAGE_FALLBACK_CHAIN, IMAGE_LOCAL_PROVIDERS } from '../../../common/constants';

@Injectable()
export class ImageGenerationService {
  private readonly logger = new Logger(ImageGenerationService.name);

  constructor(
    private readonly repository: ImageGenerationRepository,
    private readonly executionManager: ImageExecutionManager,
    private readonly eventsService: ImageGenerationEventsService,
    private readonly rabbitMQ: RabbitMQService,
  ) {}

  async enqueueGeneration(params: GenerateImageParams): Promise<ImageGenerationRecord> {
    const record = await this.repository.create({
      userId: params.userId,
      threadId: params.threadId,
      userMessageId: params.userMessageId,
      assistantMessageId: params.assistantMessageId,
      prompt: params.prompt,
      provider: params.provider,
      model: params.model,
      width: params.width,
      height: params.height,
      quality: params.quality,
      style: params.style,
    });

    await this.repository.createEvent({
      generationId: record.id,
      status: 'QUEUED',
      payloadJson: { provider: record.provider, model: record.model },
    });

    this.eventsService.publish({
      generationId: record.id,
      status: 'QUEUED',
      provider: record.provider,
      model: record.model,
    });

    this.logger.log(
      `image_generation.enqueued id=${record.id} thread=${record.threadId ?? 'none'}`,
    );

    // Fire-and-forget: process the job asynchronously
    void this.processJobWithFallback(
      record.id,
      params.isAutoMode ?? false,
      params.referenceImageBase64,
      params.referenceImageMimeType,
    );

    return record;
  }

  async getById(id: string): Promise<ImageGenerationRecord> {
    const record = await this.repository.findById(id);
    if (!record) {
      throw new BusinessException('Image generation not found', 'IMAGE_NOT_FOUND');
    }
    return record;
  }

  async getByIdForUser(id: string, userId: string): Promise<ImageGenerationRecord> {
    const record = await this.getById(id);
    if (record.userId !== userId) {
      throw new BusinessException('Image generation not found', 'IMAGE_NOT_FOUND');
    }
    return record;
  }

  async listByUser(
    userId: string,
    query: ListImagesQueryDto,
  ): Promise<{
    data: ImageGenerationRecord[];
    meta: { total: number; page: number; limit: number; totalPages: number };
  }> {
    const [data, total] = await Promise.all([
      this.repository.findByUserId(userId, query.page, query.limit),
      this.repository.countByUserId(userId),
    ]);
    return {
      data,
      meta: {
        total,
        page: query.page,
        limit: query.limit,
        totalPages: Math.ceil(total / query.limit),
      },
    };
  }

  async retryGeneration(generationId: string): Promise<ImageGenerationRecord> {
    this.logger.log(`retryGeneration: retrying generation ${generationId}`);
    const record = await this.getById(generationId);

    await this.repository.updateStatus(generationId, ImageGenerationStatus.QUEUED, {
      errorCode: undefined,
      errorMessage: undefined,
    });

    await this.repository.createEvent({
      generationId,
      status: ImageGenerationStatus.QUEUED,
      payloadJson: { retried: true },
    });

    this.eventsService.publish({
      generationId,
      status: 'QUEUED',
      provider: record.provider,
      model: record.model,
    });

    this.logger.log(`image_generation.retried id=${generationId}`);
    void this.processJob(generationId);

    return this.getById(generationId);
  }

  async retryWithAlternateModel(
    generationId: string,
    provider?: string,
    model?: string,
  ): Promise<ImageGenerationRecord> {
    this.logger.log(
      `retryWithAlternateModel: retrying generation ${generationId} with provider=${provider ?? 'auto'} model=${model ?? 'auto'}`,
    );
    const record = await this.getById(generationId);
    const { targetProvider, targetModel } = this.resolveAlternateModel(record, provider, model);
    const newRecord = await this.cloneAsAlternate(
      record,
      targetProvider,
      targetModel,
      generationId,
    );

    this.logger.log(
      `image_generation.alternate id=${newRecord.id} from=${record.provider}/${record.model} to=${targetProvider}/${targetModel}`,
    );

    void this.processJob(newRecord.id);
    return newRecord;
  }

  private resolveAlternateModel(
    record: ImageGenerationRecord,
    provider?: string,
    model?: string,
  ): { targetProvider: string; targetModel: string } {
    if (provider && model) {
      return { targetProvider: provider, targetModel: model };
    }
    const currentKey = `${record.provider}/${record.model}`;
    const currentIdx = IMAGE_FALLBACK_CHAIN.findIndex(
      (c) => `${c.provider}/${c.model}` === currentKey,
    );
    const next = IMAGE_FALLBACK_CHAIN[currentIdx + 1] ?? IMAGE_FALLBACK_CHAIN[0];
    if (!next || `${next.provider}/${next.model}` === currentKey) {
      throw new BusinessException('No alternate image model available', 'NO_ALTERNATE_MODEL');
    }
    return { targetProvider: next.provider, targetModel: next.model };
  }

  private async cloneAsAlternate(
    record: ImageGenerationRecord,
    targetProvider: string,
    targetModel: string,
    originalGenerationId: string,
  ): Promise<ImageGenerationRecord> {
    const newRecord = await this.repository.create({
      userId: record.userId,
      threadId: record.threadId ?? undefined,
      userMessageId: record.userMessageId ?? undefined,
      assistantMessageId: record.assistantMessageId ?? undefined,
      prompt: record.prompt,
      provider: targetProvider,
      model: targetModel,
      width: record.width,
      height: record.height,
      quality: record.quality ?? undefined,
      style: record.style ?? undefined,
    });

    await this.repository.createEvent({
      generationId: newRecord.id,
      status: ImageGenerationStatus.QUEUED,
      payloadJson: {
        alternateOf: originalGenerationId,
        provider: targetProvider,
        model: targetModel,
      },
    });

    this.eventsService.publish({
      generationId: newRecord.id,
      status: 'QUEUED',
      provider: targetProvider,
      model: targetModel,
    });

    // Notify the original generation's listeners about the new attempt
    this.eventsService.publish({
      generationId: originalGenerationId,
      status: 'QUEUED',
      provider: targetProvider,
      model: targetModel,
    });

    return newRecord;
  }

  private async processJobWithFallback(
    generationId: string,
    isAutoMode: boolean,
    referenceImageBase64?: string,
    referenceImageMimeType?: string,
  ): Promise<void> {
    await this.processJob(generationId, referenceImageBase64, referenceImageMimeType);

    if (!isAutoMode) {
      return;
    }

    const result = await this.repository.findById(generationId);
    if (result?.status !== 'FAILED') {
      return;
    }

    await this.runAutoFallbackChain(generationId, result, isCreditFailureCode(result.errorCode));
  }

  /**
   * Walks the auto-fallback chain after a failed attempt — EDGE CASE E3.
   *
   * Each attempt is a genuinely separate paid provider call, so each takes its
   * own reservation; there is no way to hold once and attempt N times. What must
   * never happen is billing N attempts against a wallet that could only afford
   * one, so the moment an attempt is refused for credit, `paidBlocked` latches
   * and every later candidate is filtered down to the LOCAL providers.
   *
   * It degrades rather than stopping outright because that is decision D4: at
   * zero credit, PAYG is blocked and local keeps working. Stopping here would
   * refuse a user a picture their own GPU could have drawn for free. Either way
   * the paid-attempt count after a refusal is zero, which is the property that
   * matters.
   */
  private async runAutoFallbackChain(
    originalGenerationId: string,
    failedResult: ImageGenerationRecord,
    creditRefused: boolean,
  ): Promise<void> {
    const maxRetries = 2;
    let lastFailedKey = `${failedResult.provider}/${failedResult.model}`;
    let paidBlocked = creditRefused;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      const next = this.findNextFallback(lastFailedKey, paidBlocked);
      if (!next) {
        break;
      }

      this.logger.log(
        `Auto-fallback attempt ${String(attempt + 1)}: ${lastFailedKey} → ${next.provider}/${next.model}${paidBlocked ? ' (local only — credit refused)' : ''}`,
      );

      const fallbackRecord = await this.createFallbackRecord(
        failedResult,
        next,
        originalGenerationId,
      );
      await this.processJob(fallbackRecord.id);

      const fallbackResult = await this.repository.findById(fallbackRecord.id);
      if (fallbackResult?.status === 'COMPLETED') {
        this.logger.log(
          `Auto-fallback succeeded: ${next.provider}/${next.model} (id=${fallbackRecord.id})`,
        );
        return;
      }
      if (isCreditFailureCode(fallbackResult?.errorCode)) {
        this.logger.warn(
          'Auto-fallback: credit refused — no further paid attempt will be made for this chain',
        );
        paidBlocked = true;
      }

      lastFailedKey = `${next.provider}/${next.model}`;
    }

    this.logger.warn('All auto-fallback attempts exhausted');
  }

  private findNextFallback(
    currentKey: string,
    localOnly: boolean,
  ): { provider: string; model: string } | undefined {
    const idx = IMAGE_FALLBACK_CHAIN.findIndex((c) => `${c.provider}/${c.model}` === currentKey);
    const remaining = IMAGE_FALLBACK_CHAIN.slice(idx + 1);
    if (!localOnly) {
      return remaining[0];
    }
    return remaining.find((c) => IMAGE_LOCAL_PROVIDERS.includes(c.provider));
  }

  private async createFallbackRecord(
    sourceResult: ImageGenerationRecord,
    next: { provider: string; model: string },
    originalGenerationId: string,
  ): Promise<ImageGenerationRecord> {
    const fallbackRecord = await this.repository.create({
      userId: sourceResult.userId,
      threadId: sourceResult.threadId ?? undefined,
      userMessageId: sourceResult.userMessageId ?? undefined,
      assistantMessageId: sourceResult.assistantMessageId ?? undefined,
      prompt: sourceResult.prompt,
      provider: next.provider,
      model: next.model,
      width: sourceResult.width,
      height: sourceResult.height,
    });

    this.eventsService.publish({
      generationId: fallbackRecord.id,
      status: 'QUEUED',
      provider: next.provider,
      model: next.model,
    });

    this.eventsService.publish({
      generationId: originalGenerationId,
      status: 'QUEUED',
      provider: next.provider,
      model: next.model,
    });

    return fallbackRecord;
  }

  private async processJob(
    generationId: string,
    referenceImageBase64?: string,
    referenceImageMimeType?: string,
  ): Promise<void> {
    const generation = await this.repository.findById(generationId);
    if (!generation) {
      return;
    }

    if ((TERMINAL_STATUSES as readonly string[]).includes(generation.status)) {
      return;
    }

    await this.transitionStatus(generationId, 'STARTING', generation.provider, generation.model);
    await this.transitionStatus(generationId, 'GENERATING', generation.provider, generation.model);

    try {
      await this.executeAndPersistGeneration(
        generationId,
        generation,
        referenceImageBase64,
        referenceImageMimeType,
      );
    } catch (error: unknown) {
      await this.handleProcessJobFailure(generationId, generation, error);
    }
  }

  private async executeAndPersistGeneration(
    generationId: string,
    generation: ImageGenerationRecord,
    referenceImageBase64?: string,
    referenceImageMimeType?: string,
  ): Promise<void> {
    const result = await this.executionManager.execute({
      prompt: generation.prompt,
      provider: generation.provider,
      model: generation.model,
      userId: generation.userId,
      // Fresh per ENTRY into the job, not per generation row. `reserve` is
      // idempotent on (userId, requestId), so reusing the row id would make
      // `POST /images/:id/retry` — which re-runs the SAME row — settle a second
      // real provider call against the first attempt's hold and bill it once.
      requestId: `${generationId}:${randomUUID()}`,
      width: generation.width,
      height: generation.height,
      quality: generation.quality ?? undefined,
      style: generation.style ?? undefined,
      referenceImageBase64,
      referenceImageMimeType,
    });

    await this.transitionStatus(generationId, 'FINALIZING', generation.provider, generation.model);

    const downloadUrl = `/api/v1/files/download/${result.fileId}`;
    const asset = await this.repository.createAsset({
      generationId,
      storageKey: result.fileId,
      url: downloadUrl,
      downloadUrl,
      mimeType: 'image/png',
      sizeBytes: undefined,
    });

    const completedGen = await this.repository.updateStatus(generationId, 'COMPLETED', {
      revisedPrompt: result.revisedPrompt ?? undefined,
      completedAt: new Date(),
      latencyMs: result.latencyMs,
    });

    await this.publishCompletionEvents(generationId, generation, completedGen, asset, result);
    this.logger.log(`image_generation.completed id=${generationId}`);
  }

  private async publishCompletionEvents(
    generationId: string,
    generation: ImageGenerationRecord,
    completedGen: ImageGenerationRecord,
    asset: {
      id: string;
      url: string;
      downloadUrl: string;
      mimeType: string;
      width: number | null;
      height: number | null;
      sizeBytes: number | null;
    },
    result: { fileId: string; latencyMs: number },
  ): Promise<void> {
    const assetSummary = {
      id: asset.id,
      url: asset.url,
      downloadUrl: asset.downloadUrl,
      mimeType: asset.mimeType,
      width: asset.width,
      height: asset.height,
      sizeBytes: asset.sizeBytes,
    };

    await this.repository.createEvent({
      generationId,
      status: 'COMPLETED',
      payloadJson: { assets: [assetSummary] },
    });

    this.eventsService.publish({
      generationId,
      status: 'COMPLETED',
      provider: completedGen.provider,
      model: completedGen.model,
      assets: [assetSummary],
    });

    void this.rabbitMQ.publish('image.generated', {
      generationId,
      userId: generation.userId,
      threadId: generation.threadId,
      provider: generation.provider,
      model: generation.model,
      fileId: result.fileId,
      prompt: generation.prompt,
      latencyMs: result.latencyMs,
    });
  }

  /**
   * Lands a failed attempt in a stored, visible state.
   *
   * A generation job is fire-and-forget (`void this.processJobWithFallback(…)`),
   * so this row and the SSE event it publishes are the ONLY places a failure can
   * become visible — there is no HTTP response left to carry a 402. A refused
   * reservation that only ever reached the log would show the user the generic
   * "please try again", and the retry it invites is refused identically.
   */
  private async handleProcessJobFailure(
    generationId: string,
    generation: ImageGenerationRecord,
    error: unknown,
  ): Promise<void> {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    const described = describeImageFailure(error);
    this.logger.error(
      `image_generation.failed id=${generationId} code=${described.errorCode}: ${errorMsg}`,
    );

    await this.repository.updateStatus(generationId, 'FAILED', {
      errorCode: described.errorCode,
      errorMessage: described.errorMessage,
      completedAt: new Date(),
    });

    await this.repository.createEvent({
      generationId,
      status: 'FAILED',
      payloadJson: { errorCode: described.errorCode, errorMessage: errorMsg },
    });

    this.publishFailure(generationId, generation, described, errorMsg);
  }

  private publishFailure(
    generationId: string,
    generation: ImageGenerationRecord,
    described: ImageFailureDescription,
    rawErrorMessage: string,
  ): void {
    this.eventsService.publish({
      generationId,
      status: 'FAILED',
      provider: generation.provider,
      model: generation.model,
      errorCode: described.errorCode,
      errorMessage: described.errorMessage,
    });

    void this.rabbitMQ.publish('image.failed', {
      generationId,
      userId: generation.userId,
      provider: generation.provider,
      model: generation.model,
      prompt: generation.prompt,
      errorCode: described.errorCode,
      errorMessage: rawErrorMessage,
    });
  }

  private async transitionStatus(
    generationId: string,
    status: ImageGenerationStatus,
    provider: string,
    model: string,
  ): Promise<void> {
    const extra = status === 'STARTING' ? { startedAt: new Date() } : {};
    await this.repository.updateStatus(generationId, status, extra);
    await this.repository.createEvent({ generationId, status });
    this.eventsService.publish({ generationId, status, provider, model });
  }
}
