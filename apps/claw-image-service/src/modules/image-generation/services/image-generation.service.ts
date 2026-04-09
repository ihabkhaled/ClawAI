import { Injectable, Logger } from '@nestjs/common';
import { RabbitMQService } from '@claw/shared-rabbitmq';
import { ImageGenerationStatus } from '../../../generated/prisma';
import { ImageGenerationRepository } from '../repositories/image-generation.repository';
import { ImageExecutionManager } from '../managers/image-execution.manager';
import { ImageGenerationEventsService } from './image-generation-events.service';
import {
  type GenerateImageParams,
  type ImageGenerationRecord,
  TERMINAL_STATUSES,
} from '../types/image-generation.types';
import { type ListImagesQueryDto } from '../dto/generate-image.dto';
import { BusinessException } from '../../../common/errors';
import { IMAGE_FALLBACK_CHAIN } from '../../../common/constants';

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
    void this.processJobWithFallback(record.id, params.isAutoMode ?? false);

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
    const record = await this.getById(generationId);

    let targetProvider = provider;
    let targetModel = model;

    if (!targetProvider || !targetModel) {
      const currentKey = `${record.provider}/${record.model}`;
      const currentIdx = IMAGE_FALLBACK_CHAIN.findIndex(
        (c) => `${c.provider}/${c.model}` === currentKey,
      );
      const next = IMAGE_FALLBACK_CHAIN[currentIdx + 1] ?? IMAGE_FALLBACK_CHAIN[0];
      if (!next || `${next.provider}/${next.model}` === currentKey) {
        throw new BusinessException('No alternate image model available', 'NO_ALTERNATE_MODEL');
      }
      targetProvider = next.provider;
      targetModel = next.model;
    }

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
        alternateOf: generationId,
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

    // Also notify the old generation's listeners about the new generation
    this.eventsService.publish({
      generationId,
      status: 'QUEUED',
      provider: targetProvider,
      model: targetModel,
    });

    this.logger.log(
      `image_generation.alternate id=${newRecord.id} from=${record.provider}/${record.model} to=${targetProvider}/${targetModel}`,
    );

    void this.processJob(newRecord.id);

    return newRecord;
  }

  private async processJobWithFallback(generationId: string, isAutoMode: boolean): Promise<void> {
    await this.processJob(generationId);

    if (!isAutoMode) {
      return;
    }

    // Check if it failed — if so, auto-retry with next models in chain
    const result = await this.repository.findById(generationId);
    if (!result || result.status !== 'FAILED') {
      return;
    }

    const maxRetries = 2;
    let lastFailedKey = `${result.provider}/${result.model}`;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      const searchKey = lastFailedKey;
      const idx = IMAGE_FALLBACK_CHAIN.findIndex((c) => `${c.provider}/${c.model}` === searchKey);
      const next = IMAGE_FALLBACK_CHAIN[idx + 1];
      if (!next) {
        break;
      }

      this.logger.log(
        `Auto-fallback attempt ${String(attempt + 1)}: ${lastFailedKey} → ${next.provider}/${next.model}`,
      );

      const fallbackRecord = await this.repository.create({
        userId: result.userId,
        threadId: result.threadId ?? undefined,
        userMessageId: result.userMessageId ?? undefined,
        assistantMessageId: result.assistantMessageId ?? undefined,
        prompt: result.prompt,
        provider: next.provider,
        model: next.model,
        width: result.width,
        height: result.height,
      });

      this.eventsService.publish({
        generationId: fallbackRecord.id,
        status: 'QUEUED',
        provider: next.provider,
        model: next.model,
      });

      // Notify original generation listeners about the new attempt
      this.eventsService.publish({
        generationId,
        status: 'QUEUED',
        provider: next.provider,
        model: next.model,
      });

      await this.processJob(fallbackRecord.id);

      const fallbackResult = await this.repository.findById(fallbackRecord.id);
      if (fallbackResult && fallbackResult.status === 'COMPLETED') {
        this.logger.log(
          `Auto-fallback succeeded: ${next.provider}/${next.model} (id=${fallbackRecord.id})`,
        );
        return;
      }

      lastFailedKey = `${next.provider}/${next.model}`;
    }

    this.logger.warn('All auto-fallback attempts exhausted');
  }

  private async processJob(generationId: string): Promise<void> {
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
      const result = await this.executionManager.execute({
        prompt: generation.prompt,
        provider: generation.provider,
        model: generation.model,
        userId: generation.userId,
        width: generation.width,
        height: generation.height,
        quality: generation.quality ?? undefined,
        style: generation.style ?? undefined,
      });

      await this.transitionStatus(
        generationId,
        'FINALIZING',
        generation.provider,
        generation.model,
      );

      // Create asset record linking to the file service file
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

      await this.repository.createEvent({
        generationId,
        status: 'COMPLETED',
        payloadJson: {
          assets: [
            {
              id: asset.id,
              url: asset.url,
              downloadUrl: asset.downloadUrl,
              mimeType: asset.mimeType,
              width: asset.width,
              height: asset.height,
              sizeBytes: asset.sizeBytes,
            },
          ],
        },
      });

      this.eventsService.publish({
        generationId,
        status: 'COMPLETED',
        provider: completedGen.provider,
        model: completedGen.model,
        assets: [
          {
            id: asset.id,
            url: asset.url,
            downloadUrl: asset.downloadUrl,
            mimeType: asset.mimeType,
            width: asset.width,
            height: asset.height,
            sizeBytes: asset.sizeBytes,
          },
        ],
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

      this.logger.log(`image_generation.completed id=${generationId}`);
    } catch (error: unknown) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`image_generation.failed id=${generationId}: ${errorMsg}`);

      await this.repository.updateStatus(generationId, 'FAILED', {
        errorCode: 'PROVIDER_FAILURE',
        errorMessage: 'Image generation failed. Please try again.',
        completedAt: new Date(),
      });

      await this.repository.createEvent({
        generationId,
        status: 'FAILED',
        payloadJson: { errorCode: 'PROVIDER_FAILURE', errorMessage: errorMsg },
      });

      this.eventsService.publish({
        generationId,
        status: 'FAILED',
        provider: generation.provider,
        model: generation.model,
        errorCode: 'PROVIDER_FAILURE',
        errorMessage: 'Image generation failed. Please try again.',
      });

      void this.rabbitMQ.publish('image.failed', {
        generationId,
        userId: generation.userId,
        provider: generation.provider,
        model: generation.model,
        prompt: generation.prompt,
        errorMessage: errorMsg,
      });
    }
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
