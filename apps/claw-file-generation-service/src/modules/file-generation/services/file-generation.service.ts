import { Injectable, Logger } from '@nestjs/common';
import { RabbitMQService } from '@claw/shared-rabbitmq';
import { type FileFormat, FileGenerationStatus } from '../../../generated/prisma';
import { FileGenerationRepository } from '../repositories/file-generation.repository';
import { FileExecutionManager } from '../managers/file-execution.manager';
import { FileGenerationEventsService } from './file-generation-events.service';
import { FORMAT_TO_MIME_TYPE } from '../../../common/constants';
import {
  type FileGenerationRecord,
  type GenerateFileParams,
  TERMINAL_STATUSES,
} from '../types/file-generation.types';
import { type ListFileGenerationsQueryDto } from '../dto/generate-file.dto';
import { BusinessException } from '../../../common/errors';

@Injectable()
export class FileGenerationService {
  private readonly logger = new Logger(FileGenerationService.name);

  constructor(
    private readonly repository: FileGenerationRepository,
    private readonly executionManager: FileExecutionManager,
    private readonly eventsService: FileGenerationEventsService,
    private readonly rabbitMQ: RabbitMQService,
  ) {}

  async enqueueGeneration(params: GenerateFileParams): Promise<FileGenerationRecord> {
    const filename = params.filename ?? this.executionManager.generateFilename(params.format);

    const record = await this.repository.create({
      userId: params.userId,
      threadId: params.threadId,
      userMessageId: params.userMessageId,
      assistantMessageId: params.assistantMessageId,
      prompt: params.prompt,
      content: params.content,
      format: params.format as FileFormat,
      filename,
      provider: params.provider,
      model: params.model,
    });

    await this.repository.createEvent({
      generationId: record.id,
      status: 'QUEUED',
      payloadJson: { format: record.format, filename },
    });

    this.eventsService.publish({
      generationId: record.id,
      status: 'QUEUED',
      provider: record.provider,
      model: record.model,
      format: record.format,
    });

    this.logger.log(`file_generation.enqueued id=${record.id} format=${record.format}`);
    void this.processJob(record.id);

    return record;
  }

  async getById(id: string): Promise<FileGenerationRecord> {
    const record = await this.repository.findById(id);
    if (!record) {
      throw new BusinessException('File generation not found', 'FILE_GENERATION_NOT_FOUND');
    }
    return record;
  }

  async getByIdForUser(id: string, userId: string): Promise<FileGenerationRecord> {
    const record = await this.getById(id);
    if (record.userId !== userId) {
      throw new BusinessException('File generation not found', 'FILE_GENERATION_NOT_FOUND');
    }
    return record;
  }

  async listByUser(
    userId: string,
    query: ListFileGenerationsQueryDto,
  ): Promise<{
    data: FileGenerationRecord[];
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

  async retryGeneration(generationId: string): Promise<FileGenerationRecord> {
    this.logger.log(`retryGeneration: retrying file generation ${generationId}`);
    await this.repository.updateStatus(generationId, FileGenerationStatus.QUEUED, {
      errorCode: undefined,
      errorMessage: undefined,
    });
    this.logger.log(`file_generation.retried id=${generationId}`);
    void this.processJob(generationId);
    return this.getById(generationId);
  }

  private async processJob(generationId: string): Promise<void> {
    const generation = await this.repository.findById(generationId);
    if (!generation || (TERMINAL_STATUSES as readonly string[]).includes(generation.status)) {
      return;
    }

    await this.transitionStatus(generationId, 'STARTING', generation);
    await this.transitionStatus(generationId, 'CONVERTING', generation);

    try {
      const content = generation.content ?? '';
      const buffer = await this.executionManager.convert(content, generation.format);

      await this.transitionStatus(generationId, 'FINALIZING', generation);

      const filename =
        generation.filename ?? this.executionManager.generateFilename(generation.format);
      const fileId = await this.executionManager.storeFile({
        userId: generation.userId,
        filename,
        format: generation.format,
        buffer,
      });

      const downloadUrl = `/api/v1/files/download/${fileId}`;
      const mimeType = FORMAT_TO_MIME_TYPE[generation.format] ?? 'application/octet-stream';

      const asset = await this.repository.createAsset({
        generationId,
        storageKey: fileId,
        url: downloadUrl,
        downloadUrl,
        mimeType,
        sizeBytes: buffer.length,
      });

      await this.repository.updateStatus(generationId, FileGenerationStatus.COMPLETED, {
        completedAt: new Date(),
        latencyMs: Date.now() - generation.createdAt.getTime(),
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
              sizeBytes: asset.sizeBytes,
            },
          ],
        },
      });

      this.eventsService.publish({
        generationId,
        status: 'COMPLETED',
        provider: generation.provider,
        model: generation.model,
        format: generation.format,
        assets: [
          {
            id: asset.id,
            url: asset.url,
            downloadUrl: asset.downloadUrl,
            mimeType: asset.mimeType,
            sizeBytes: asset.sizeBytes,
          },
        ],
      });

      void this.rabbitMQ.publish('file.generated', {
        generationId,
        userId: generation.userId,
        threadId: generation.threadId,
        format: generation.format,
        fileId,
      });

      this.logger.log(`file_generation.completed id=${generationId} format=${generation.format}`);
    } catch (error: unknown) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`file_generation.failed id=${generationId}: ${errorMsg}`);

      await this.repository.updateStatus(generationId, FileGenerationStatus.FAILED, {
        errorCode: 'CONVERSION_FAILURE',
        errorMessage: 'File generation failed. Please try again.',
        completedAt: new Date(),
      });

      this.eventsService.publish({
        generationId,
        status: 'FAILED',
        provider: generation.provider,
        model: generation.model,
        errorCode: 'CONVERSION_FAILURE',
        errorMessage: 'File generation failed. Please try again.',
      });
    }
  }

  private async transitionStatus(
    generationId: string,
    status: FileGenerationStatus,
    generation: FileGenerationRecord,
  ): Promise<void> {
    const extra = status === FileGenerationStatus.STARTING ? { startedAt: new Date() } : {};
    await this.repository.updateStatus(generationId, status, extra);
    await this.repository.createEvent({ generationId, status });
    this.eventsService.publish({
      generationId,
      status,
      provider: generation.provider,
      model: generation.model,
      format: generation.format,
    });
  }
}
