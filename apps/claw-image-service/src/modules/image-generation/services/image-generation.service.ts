import { Injectable, Logger } from '@nestjs/common';
import { RabbitMQService } from '@claw/shared-rabbitmq';
import { ImageGenerationRepository } from '../repositories/image-generation.repository';
import { ImageExecutionManager } from '../managers/image-execution.manager';
import { ImageGenerationStatus } from '../../../generated/prisma';
import {
  type GenerateImageParams,
  type GenerateImageResult,
  type ImageGenerationRecord,
} from '../types/image-generation.types';
import { type ListImagesQueryDto } from '../dto/generate-image.dto';
import { BusinessException } from '../../../common/errors';

@Injectable()
export class ImageGenerationService {
  private readonly logger = new Logger(ImageGenerationService.name);

  constructor(
    private readonly repository: ImageGenerationRepository,
    private readonly executionManager: ImageExecutionManager,
    private readonly rabbitMQ: RabbitMQService,
  ) {}

  async generate(params: GenerateImageParams): Promise<GenerateImageResult> {
    const record = await this.repository.create({
      userId: params.userId,
      threadId: params.threadId,
      messageId: params.messageId,
      prompt: params.prompt,
      provider: params.provider,
      model: params.model,
      width: params.width ?? 1024,
      height: params.height ?? 1024,
      quality: params.quality,
      style: params.style,
    });

    await this.repository.updateStatus(record.id, ImageGenerationStatus.GENERATING);

    try {
      const result = await this.executionManager.execute(params);

      await this.repository.updateStatus(record.id, ImageGenerationStatus.COMPLETED, {
        fileId: result.fileId,
        revisedPrompt: result.revisedPrompt ?? undefined,
        latencyMs: result.latencyMs,
      });

      this.publishImageGenerated(record.id, params, result);
      return result;
    } catch (error: unknown) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Image generation failed: ${errorMsg}`);

      await this.repository.updateStatus(record.id, ImageGenerationStatus.FAILED, {
        errorMessage: errorMsg,
      });

      this.publishImageFailed(record.id, params, errorMsg);
      throw error;
    }
  }

  async getById(id: string, userId: string): Promise<ImageGenerationRecord> {
    const record = await this.repository.findById(id);
    if (!record || record.userId !== userId) {
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

  private publishImageGenerated(
    recordId: string,
    params: GenerateImageParams,
    result: GenerateImageResult,
  ): void {
    void this.rabbitMQ.publish('image.generated', {
      imageGenerationId: recordId,
      userId: params.userId,
      threadId: params.threadId,
      provider: params.provider,
      model: params.model,
      fileId: result.fileId,
      prompt: params.prompt,
      latencyMs: result.latencyMs,
    });
  }

  private publishImageFailed(
    recordId: string,
    params: GenerateImageParams,
    errorMessage: string,
  ): void {
    void this.rabbitMQ.publish('image.failed', {
      imageGenerationId: recordId,
      userId: params.userId,
      provider: params.provider,
      model: params.model,
      prompt: params.prompt,
      errorMessage,
    });
  }
}
