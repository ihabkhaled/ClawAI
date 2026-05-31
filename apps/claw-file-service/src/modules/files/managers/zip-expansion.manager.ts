import * as fs from 'node:fs';
import * as path from 'node:path';
import { forwardRef, Inject, Injectable, Logger } from '@nestjs/common';
import { RabbitMQService } from '@claw/shared-rabbitmq';
import {
  EventPattern,
  type FileArchiveExpandedPayload,
  type FileFailedPayload,
} from '@claw/shared-types';
import { type File, FileIngestionStatus } from '../../../generated/prisma';
import { AppConfig } from '../../../app/config/app.config';
import { BusinessException } from '../../../common/errors/business.exception';
import { validateAndExtractZip } from '../../../common/utilities/zip-extraction.utility';
import { FilesRepository } from '../repositories/files.repository';
import { FileChunksRepository } from '../repositories/file-chunks.repository';
import { FileProcessingManager } from './file-processing.manager';
import { FileSecurityManager } from './file-security.manager';
import type {
  ExtractedEntry,
  ZipExtractionResult,
  ZipExtractionThresholds,
} from '../types/zip-expansion.types';

@Injectable()
export class ZipExpansionManager {
  private readonly logger = new Logger(ZipExpansionManager.name);

  constructor(
    private readonly fileSecurityManager: FileSecurityManager,
    private readonly filesRepository: FilesRepository,
    private readonly fileChunksRepository: FileChunksRepository,
    @Inject(forwardRef(() => FileProcessingManager))
    private readonly fileProcessingManager: FileProcessingManager,
    private readonly rabbitMQService: RabbitMQService,
  ) {}

  async expandArchive(parentFile: File): Promise<void> {
    this.logger.log(
      `expandArchive: starting parentFileId=${parentFile.id} filename=${parentFile.filename}`,
    );
    // Re-extraction safety: if the parent archive is being reprocessed, drop
    // any stale chunks left over from a previous attempt so the audit trail
    // and chunk count reflect THIS expansion run, not a partial earlier one.
    await this.fileChunksRepository.deleteByFileId(parentFile.id);

    await this.fileProcessingManager.updateIngestionStatus(
      parentFile.id,
      FileIngestionStatus.PROCESSING,
    );

    const thresholds = this.readThresholds();
    const destDir = this.buildExtractionDir(parentFile.id);

    let extraction: ZipExtractionResult;
    try {
      extraction = await validateAndExtractZip(parentFile.storagePath, destDir, thresholds);
    } catch (error: unknown) {
      await this.handleExtractionFailure(parentFile, error);
      return;
    }

    try {
      const createdChildren = await this.onboardExtractedEntries(parentFile, extraction.entries);
      await this.finalize(parentFile, createdChildren, extraction);
    } catch (error: unknown) {
      await this.handleExtractionFailure(parentFile, error);
    }
  }

  private readThresholds(): ZipExtractionThresholds {
    const cfg = AppConfig.get();
    return {
      maxExtractedSizeMb: cfg.ZIP_MAX_EXTRACTED_SIZE_MB,
      maxEntryCount: cfg.ZIP_MAX_ENTRY_COUNT,
      maxNestingDepth: cfg.ZIP_MAX_NESTING_DEPTH,
      compressionRatioThreshold: cfg.ZIP_COMPRESSION_RATIO_THRESHOLD,
    };
  }

  private buildExtractionDir(parentFileId: string): string {
    const cfg = AppConfig.get();
    const dir = path.join(cfg.ZIP_TEMP_EXTRACTION_PATH, parentFileId);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    return dir;
  }

  private async onboardExtractedEntries(
    parentFile: File,
    entries: ReadonlyArray<ExtractedEntry>,
  ): Promise<number> {
    let createdChildren = 0;
    for (const entry of entries) {
      const onboarded = await this.onboardSingleEntry(parentFile, entry);
      if (onboarded) {
        createdChildren += 1;
      }
    }
    return createdChildren;
  }

  private async onboardSingleEntry(parentFile: File, entry: ExtractedEntry): Promise<boolean> {
    const filename = path.basename(entry.path);
    const buffer = fs.readFileSync(entry.path);
    const check = await this.fileSecurityManager.runAllChecks(filename, entry.mimeType, buffer);
    if (!check.passed) {
      this.logger.warn(
        `onboardSingleEntry: SKIPPED unsafe entry parentId=${parentFile.id} name=${filename}`,
      );
      return false;
    }

    const child = await this.filesRepository.create({
      userId: parentFile.userId,
      filename,
      mimeType: entry.mimeType,
      sizeBytes: entry.sizeBytes,
      storagePath: entry.path,
    });

    // Stamp the parent linkage. We do it after create because CreateFileData
    // does not (yet) accept parentFileId / isExtracted — this keeps the
    // repository contract narrow while still persisting the relationship.
    await this.filesRepository.markAsExtractedChild(child.id, parentFile.id);

    await this.fileProcessingManager.processFile({
      ...child,
      parentFileId: parentFile.id,
      isExtracted: true,
    });
    return true;
  }

  private async finalize(
    parentFile: File,
    childFileCount: number,
    extraction: ZipExtractionResult,
  ): Promise<void> {
    await this.filesRepository.recordExtractionMetadata(parentFile.id, {
      childFileCount,
      totalExtractedBytes: extraction.totalExtractedBytes,
      expandedAt: new Date().toISOString(),
    });
    await this.fileProcessingManager.updateIngestionStatus(
      parentFile.id,
      FileIngestionStatus.COMPLETED,
    );

    const payload: FileArchiveExpandedPayload = {
      parentFileId: parentFile.id,
      userId: parentFile.userId,
      parentFilename: parentFile.filename,
      childFileCount,
      totalExtractedBytes: extraction.totalExtractedBytes,
      timestamp: new Date().toISOString(),
    };
    void this.rabbitMQService.publish(EventPattern.FILE_ARCHIVE_EXPANDED, payload);
    this.logger.log(
      `expandArchive: completed parentFileId=${parentFile.id} children=${String(childFileCount)} bytes=${String(extraction.totalExtractedBytes)}`,
    );
  }

  private async handleExtractionFailure(parentFile: File, error: unknown): Promise<void> {
    const errorMessage = error instanceof Error ? error.message : 'Unknown ZIP expansion error';
    const code = error instanceof BusinessException ? error.code : 'ZIP_EXPANSION_FAILED';
    this.logger.error(
      `expandArchive: parentFileId=${parentFile.id} failed code=${code} message=${errorMessage}`,
    );

    await this.fileProcessingManager.updateIngestionStatus(
      parentFile.id,
      FileIngestionStatus.FAILED,
    );

    const payload: FileFailedPayload = {
      fileId: parentFile.id,
      userId: parentFile.userId,
      filename: parentFile.filename,
      errorMessage: `${code}: ${errorMessage}`,
      failureStage: 'EXTRACTION',
      timestamp: new Date().toISOString(),
    };
    void this.rabbitMQService.publish(EventPattern.FILE_FAILED, payload);
  }
}
