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
    void this.processJob(record.id);

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
