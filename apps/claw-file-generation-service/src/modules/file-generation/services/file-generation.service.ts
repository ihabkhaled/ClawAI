import {
  HttpStatus,
  Injectable,
  Logger,
  type OnModuleDestroy,
  type OnModuleInit,
} from '@nestjs/common';
import { RabbitMQService } from '@claw/shared-rabbitmq';
import { FileGenerationStatus } from '../../../generated/prisma';
import { FileGenerationRepository } from '../repositories/file-generation.repository';
import { FileExecutionManager } from '../managers/file-execution.manager';
import { FileGenerationEventsService } from './file-generation-events.service';
import { FORMAT_TO_EXTENSION, FORMAT_TO_MIME_TYPE } from '../../../common/constants';
import {
  EXPORT_MODEL,
  EXPORT_PROMPT,
  EXPORT_PROVIDER,
  FILE_ASSET_SWEEP_BATCH,
  FILE_ASSET_SWEEP_INTERVAL_MS,
  FILE_ASSET_TTL_MS,
} from '../constants/file-asset.constants';
import {
  fileAssetDownloadPath,
  isAssetExpired,
  safeDownloadFilename,
  toGenerationView,
} from '../utilities/file-asset.utility';
import {
  type FileAssetDownload,
  type FileGenerationAssetRecord,
  type FileGenerationRecord,
  type FileGenerationView,
  type GenerateFileParams,
  TERMINAL_STATUSES,
} from '../types/file-generation.types';
import { type ExportFileDto, type ListFileGenerationsQueryDto } from '../dto/generate-file.dto';
import { BusinessException } from '../../../common/errors';

@Injectable()
export class FileGenerationService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(FileGenerationService.name);

  constructor(
    private readonly repository: FileGenerationRepository,
    private readonly executionManager: FileExecutionManager,
    private readonly eventsService: FileGenerationEventsService,
    private readonly rabbitMQ: RabbitMQService,
  ) {}

  private sweepTimer: ReturnType<typeof setInterval> | null = null;

  onModuleInit(): void {
    this.sweepTimer = setInterval(() => {
      void this.sweepExpiredAssets();
    }, FILE_ASSET_SWEEP_INTERVAL_MS);
  }

  onModuleDestroy(): void {
    if (this.sweepTimer !== null) {
      clearInterval(this.sweepTimer);
    }
  }

  /**
   * The owner's file, streamed through this service. The id in the URL is the
   * asset's, never file-service's, and an expired asset answers 410 so the chat
   * can offer a rebuild instead of a broken download.
   */
  async openAssetForUser(
    generationId: string,
    assetId: string,
    userId: string,
    now = new Date(),
  ): Promise<FileAssetDownload> {
    const generation = await this.getByIdForUser(generationId, userId);
    const asset = await this.repository.findAsset(generationId, assetId);
    if (asset === null) {
      throw new BusinessException('File not found', 'FILE_ASSET_NOT_FOUND');
    }
    if (isAssetExpired(asset, now)) {
      throw new BusinessException(
        'This file has expired; rebuild it from the chat',
        'FILE_EXPIRED',
        HttpStatus.GONE,
      );
    }
    const extension = FORMAT_TO_EXTENSION[generation.format] ?? 'txt';
    return {
      stream: await this.executionManager.openStoredFile(asset.storageKey),
      mimeType: asset.mimeType,
      filename: safeDownloadFilename(generation.filename, extension),
      sizeBytes: asset.sizeBytes,
    };
  }

  /**
   * Builds the file again from the text it was made from: free, instant and
   * identical. "Ask the AI again" is the chat's regenerate, not this.
   */
  async rebuildForUser(generationId: string, userId: string): Promise<FileGenerationRecord> {
    const generation = await this.getByIdForUser(generationId, userId);
    if ((generation.content ?? '').length === 0) {
      throw new BusinessException(
        'Nothing to rebuild this file from',
        'FILE_CONTENT_UNAVAILABLE',
        HttpStatus.CONFLICT,
      );
    }
    this.logger.log(`rebuildForUser: rebuilding ${generationId}`);
    await this.repository.updateStatus(generationId, FileGenerationStatus.QUEUED, {
      errorCode: undefined,
      errorMessage: undefined,
    });
    void this.processJob(generationId);
    return this.getById(generationId);
  }

  /** Deletes the bytes of every asset whose hour is up; keeps the rows. */
  async sweepExpiredAssets(now = new Date()): Promise<number> {
    const expired = await this.repository.findExpiredAssets(now, FILE_ASSET_SWEEP_BATCH);
    let swept = 0;
    for (const asset of expired) {
      const generation = await this.repository.findById(asset.generationId);
      try {
        if (generation !== null) {
          await this.executionManager.deleteStoredFile(asset.storageKey, generation.userId);
        }
        await this.repository.markAssetExpired(asset.id, now);
        swept += 1;
      } catch (error: unknown) {
        this.logger.warn(`sweepExpiredAssets: asset ${asset.id} - ${(error as Error).message}`);
      }
    }
    if (swept > 0) {
      this.logger.log(`sweepExpiredAssets: expired ${String(swept)} file(s)`);
    }
    return swept;
  }

  async enqueueGeneration(params: GenerateFileParams): Promise<FileGenerationRecord> {
    const filename = params.filename ?? this.executionManager.generateFilename(params.format);

    const record = await this.repository.create({
      userId: params.userId,
      threadId: params.threadId,
      userMessageId: params.userMessageId,
      assistantMessageId: params.assistantMessageId,
      prompt: params.prompt,
      content: params.content,
      format: params.format,
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

  /**
   * Turns text the user already has into a file, with no model call: the same
   * converters, owner-only download and one-hour life as a generated file.
   */
  async exportForUser(userId: string, dto: ExportFileDto): Promise<FileGenerationRecord> {
    return this.enqueueGeneration({
      userId,
      prompt: EXPORT_PROMPT,
      content: dto.content,
      format: dto.format,
      provider: EXPORT_PROVIDER,
      model: EXPORT_MODEL,
      ...(dto.title === undefined || dto.title.length === 0 ? {} : { filename: dto.title }),
    });
  }

  /** The owner's generation as a user may see it (no storage keys). */
  async getViewForUser(id: string, userId: string): Promise<FileGenerationView> {
    return toGenerationView(await this.getByIdForUser(id, userId));
  }

  async listByUser(
    userId: string,
    query: ListFileGenerationsQueryDto,
  ): Promise<{
    data: FileGenerationView[];
    meta: { total: number; page: number; limit: number; totalPages: number };
  }> {
    const [data, total] = await Promise.all([
      this.repository.findByUserId(userId, query.page, query.limit),
      this.repository.countByUserId(userId),
    ]);
    return {
      data: data.map((record) => toGenerationView(record)),
      meta: {
        total,
        page: query.page,
        limit: query.limit,
        totalPages: Math.ceil(total / query.limit),
      },
    };
  }

  /** Retry for the job's owner; anyone else gets the same not-found as a missing job. */
  async retryGenerationForUser(
    generationId: string,
    userId: string,
  ): Promise<FileGenerationRecord> {
    await this.getByIdForUser(generationId, userId);
    return this.retryGeneration(generationId);
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
      await this.runSuccessfulConversion(generationId, generation);
    } catch (error: unknown) {
      await this.handleProcessJobFailure(generationId, generation, error);
    }
  }

  private async runSuccessfulConversion(
    generationId: string,
    generation: FileGenerationRecord,
  ): Promise<void> {
    const buffer = await this.executionManager.convert(generation.content ?? '', generation.format);

    await this.transitionStatus(generationId, 'FINALIZING', generation);

    const fileId = await this.persistGeneratedFile(generation, buffer);
    const asset = await this.persistGeneratedAsset(generationId, generation, fileId, buffer.length);

    await this.repository.updateStatus(generationId, FileGenerationStatus.COMPLETED, {
      completedAt: new Date(),
      latencyMs: Date.now() - generation.createdAt.getTime(),
    });

    await this.publishCompletionEvents(generationId, generation, fileId, asset);

    this.logger.log(`file_generation.completed id=${generationId} format=${generation.format}`);
  }

  private async persistGeneratedFile(
    generation: FileGenerationRecord,
    buffer: Buffer,
  ): Promise<string> {
    const filename =
      generation.filename ?? this.executionManager.generateFilename(generation.format);
    return this.executionManager.storeFile({
      userId: generation.userId,
      filename,
      format: generation.format,
      buffer,
    });
  }

  private async persistGeneratedAsset(
    generationId: string,
    generation: FileGenerationRecord,
    fileId: string,
    sizeBytes: number,
  ): Promise<FileGenerationAssetRecord> {
    const mimeType = FORMAT_TO_MIME_TYPE[generation.format] ?? 'application/octet-stream';
    const created = await this.repository.createAsset({
      generationId,
      storageKey: fileId,
      url: '',
      downloadUrl: '',
      mimeType,
      sizeBytes,
      expiresAt: new Date(Date.now() + FILE_ASSET_TTL_MS),
    });
    // The browser only ever sees this path: it names the asset, not the
    // stored file, and the controller checks the owner on every download.
    return this.repository.setAssetUrls(
      created.id,
      fileAssetDownloadPath(generationId, created.id),
    );
  }

  private async publishCompletionEvents(
    generationId: string,
    generation: FileGenerationRecord,
    fileId: string,
    asset: FileGenerationAssetRecord,
  ): Promise<void> {
    const assetSummary = {
      id: asset.id,
      url: asset.url,
      downloadUrl: asset.downloadUrl,
      mimeType: asset.mimeType,
      sizeBytes: asset.sizeBytes,
      // The chat shows "available for N min" from these the moment the file lands.
      expiresAt: asset.expiresAt?.toISOString() ?? null,
      expiredAt: null,
      createdAt: asset.createdAt.toISOString(),
    };

    await this.repository.createEvent({
      generationId,
      status: 'COMPLETED',
      payloadJson: { assets: [assetSummary] },
    });

    this.eventsService.publish({
      generationId,
      status: 'COMPLETED',
      provider: generation.provider,
      model: generation.model,
      format: generation.format,
      assets: [assetSummary],
    });

    void this.rabbitMQ.publish('file.generated', {
      generationId,
      userId: generation.userId,
      threadId: generation.threadId,
      format: generation.format,
      fileId,
    });
  }

  private async handleProcessJobFailure(
    generationId: string,
    generation: FileGenerationRecord,
    error: unknown,
  ): Promise<void> {
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
