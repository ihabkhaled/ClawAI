import { randomUUID } from 'node:crypto';
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
import { ArchiveEntryStatus } from '../../../common/enums/archive-entry-status.enum';
import { saveFile } from '../../../common/utilities/file-storage.utility';
import {
  prepareExtractionDir,
  removeExtractionDir,
} from '../../../common/utilities/zip-extraction.utility';
import { validateAndExtractArchive } from '../../../common/utilities/archive-extraction.utility';
import {
  isArchiveMimeType,
  resolveUploadMimeType,
} from '../../../common/utilities/archive-format.utility';
import {
  ARCHIVE_ENCRYPTED_ERROR_CODE,
  ARCHIVE_ROOT_DEPTH,
  BYTES_PER_MEGABYTE,
  ZIP_EXPANSION_FAILED_ERROR_CODE,
} from '../constants/zip-expansion.constants';
import { FilesRepository } from '../repositories/files.repository';
import { FileChunksRepository } from '../repositories/file-chunks.repository';
import {
  buildArchiveManifest,
  classifyExtractedChild,
  toSkippedRow,
} from '../utilities/archive-manifest.utility';
import { FileProcessingManager } from './file-processing.manager';
import { FileSecurityManager } from './file-security.manager';
import type { ArchiveManifestRow } from '../types/archive-manifest.types';
import type {
  ExtractedEntry,
  FileProcessingContract,
  ZipExtractionContext,
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
    // Typed as the contract, NOT as FileProcessingManager: a class-typed
    // parameter makes tsgo emit the class into `design:paramtypes`, which is
    // read while this module is still evaluating and throws
    // `Cannot access 'FileProcessingManager' before initialization` under ESM.
    // The forwardRef closure below is lazy and stays as it is.
    @Inject(forwardRef(() => FileProcessingManager))
    private readonly fileProcessingManager: FileProcessingContract,
    private readonly rabbitMQService: RabbitMQService,
  ) {}

  /**
   * Expands an archive into child file rows and writes the archive manifest to
   * the archive's own `extractedText`.
   *
   * `context` is omitted for an uploaded archive and passed when this manager
   * recurses into an archive inside an archive: it carries the nesting depth and
   * the extracted-bytes budget every level shares.
   */
  async expandArchive(parentFile: File, context?: ZipExtractionContext): Promise<void> {
    const expansion = context ?? this.createRootContext();
    this.logger.log(
      `expandArchive: starting parentFileId=${parentFile.id} filename=${parentFile.filename} depth=${String(expansion.depth)}`,
    );
    // Re-extraction safety: if the parent archive is being reprocessed, drop
    // any stale chunks left over from a previous attempt so the audit trail
    // and chunk count reflect THIS expansion run, not a partial earlier one.
    await this.fileChunksRepository.deleteByFileId(parentFile.id);

    await this.fileProcessingManager.updateIngestionStatus(
      parentFile.id,
      FileIngestionStatus.PROCESSING,
    );

    const destDir = prepareExtractionDir(AppConfig.get().ZIP_TEMP_EXTRACTION_PATH, parentFile.id);
    try {
      await this.expandInto(parentFile, destDir, expansion);
    } finally {
      // The temp directory is tmpfs and only a staging area: every child has
      // been copied to FILE_STORAGE_PATH by now, or the expansion failed.
      removeExtractionDir(destDir);
    }
  }

  private createRootContext(): ZipExtractionContext {
    const cfg = AppConfig.get();
    return {
      depth: ARCHIVE_ROOT_DEPTH,
      budget: { remainingBytes: cfg.ZIP_MAX_EXTRACTED_SIZE_MB * BYTES_PER_MEGABYTE },
    };
  }

  private async expandInto(
    parentFile: File,
    destDir: string,
    context: ZipExtractionContext,
  ): Promise<void> {
    let extraction: ZipExtractionResult;
    try {
      extraction = await validateAndExtractArchive(
        parentFile.storagePath,
        destDir,
        this.readThresholds(),
        context,
        { archiveFilename: parentFile.filename },
      );
    } catch (error: unknown) {
      await this.handleExtractionFailure(parentFile, error);
      return;
    }

    try {
      const rows = await this.onboardExtractedEntries(parentFile, extraction.entries, context);
      await this.finalize(parentFile, rows, extraction, context);
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

  private async onboardExtractedEntries(
    parentFile: File,
    entries: ReadonlyArray<ExtractedEntry>,
    context: ZipExtractionContext,
  ): Promise<ArchiveManifestRow[]> {
    const rows: ArchiveManifestRow[] = [];
    for (const entry of entries) {
      rows.push(await this.onboardSingleEntry(parentFile, entry, context));
    }
    return rows;
  }

  private async onboardSingleEntry(
    parentFile: File,
    entry: ExtractedEntry,
    context: ZipExtractionContext,
  ): Promise<ArchiveManifestRow> {
    const filename = path.basename(entry.archivePath);
    const buffer = fs.readFileSync(entry.path);
    // An entry's MIME comes from its extension; an archive named without one
    // ("backup", "data.bin") is recognised by its bytes, as an upload is.
    const mimeType = await resolveUploadMimeType(entry.mimeType, buffer);
    if (isArchiveMimeType(mimeType) && context.depth >= this.readThresholds().maxNestingDepth) {
      return toSkippedRow({
        archivePath: entry.archivePath,
        sizeBytes: entry.sizeBytes,
        status: ArchiveEntryStatus.SKIPPED_NESTING_DEPTH,
      });
    }
    const check = await this.fileSecurityManager.runAllChecks(filename, mimeType, buffer);
    if (!check.passed) {
      this.logger.warn(
        `onboardSingleEntry: SKIPPED unsafe entry parentId=${parentFile.id} name=${filename}`,
      );
      return toSkippedRow({
        archivePath: entry.archivePath,
        sizeBytes: entry.sizeBytes,
        status: ArchiveEntryStatus.SKIPPED_UNSAFE,
      });
    }

    // Persistent storage, exactly like a direct upload. The extraction dir is a
    // tmpfs staging area removed after this expansion; a child pointing into it
    // lost its bytes on the next restart. The UUID keeps two entries with the
    // same basename (src/index.ts, test/index.ts) from overwriting each other.
    const storagePath = saveFile(`${String(Date.now())}-${randomUUID()}-${filename}`, buffer);
    const child = await this.filesRepository.create({
      userId: parentFile.userId,
      filename,
      mimeType,
      sizeBytes: entry.sizeBytes,
      storagePath,
      // A child lives exactly as long as the archive it came from.
      retentionExpiresAt: parentFile.retentionExpiresAt,
    });

    // Stamp the parent linkage. We do it after create because CreateFileData
    // does not (yet) accept parentFileId / isExtracted — this keeps the
    // repository contract narrow while still persisting the relationship.
    await this.filesRepository.markAsExtractedChild(child.id, parentFile.id, entry.archivePath);

    const linkedChild: File = {
      ...child,
      parentFileId: parentFile.id,
      isExtracted: true,
      archivePath: entry.archivePath,
    };
    await this.processChild(linkedChild, context);

    const state = await this.filesRepository.findExtractionState(child.id);
    return classifyExtractedChild({
      archivePath: entry.archivePath,
      sizeBytes: entry.sizeBytes,
      childFileId: child.id,
      state,
    });
  }

  // A nested archive — any supported format inside any other — recurses HERE,
  // not through FileProcessingManager: that route starts a fresh root context,
  // which is how depth used to reset at every level and ZIP_MAX_NESTING_DEPTH
  // was never enforced. The extractor skipped a nested archive at the depth
  // limit by its extension, and onboardSingleEntry by its bytes, so one that
  // reaches this point may be opened.
  private async processChild(child: File, context: ZipExtractionContext): Promise<void> {
    if (isArchiveMimeType(child.mimeType)) {
      await this.expandArchive(child, { depth: context.depth + 1, budget: context.budget });
      return;
    }
    await this.fileProcessingManager.processFile(child);
  }

  private async finalize(
    parentFile: File,
    childRows: ReadonlyArray<ArchiveManifestRow>,
    extraction: ZipExtractionResult,
    context: ZipExtractionContext,
  ): Promise<void> {
    const childFileCount = childRows.filter((row) => row.childFileId !== null).length;
    const manifest = await buildArchiveManifest({
      archiveFilename: parentFile.filename,
      rows: [...childRows, ...extraction.skippedEntries.map((entry) => toSkippedRow(entry))],
      fileEntryCount: extraction.fileEntryCount,
      encryptedEntryCount: extraction.encryptedEntryCount,
      totalExtractedBytes: extraction.totalExtractedBytes,
      loadText: (childFileId) => this.filesRepository.findExtractedText(childFileId),
    });

    await this.filesRepository.recordExtractionMetadata(parentFile.id, {
      childFileCount,
      totalExtractedBytes: extraction.totalExtractedBytes,
      expandedAt: new Date().toISOString(),
      fileEntryCount: extraction.fileEntryCount,
      skippedEntryCount: extraction.fileEntryCount - childFileCount,
      encryptedEntryCount: extraction.encryptedEntryCount,
      depth: context.depth,
    });

    const allEncrypted =
      extraction.encryptedEntryCount > 0 &&
      extraction.encryptedEntryCount === extraction.fileEntryCount;
    if (allEncrypted) {
      await this.finalizeAllEncrypted(parentFile, manifest, extraction.encryptedEntryCount);
      return;
    }

    await this.filesRepository.saveExtractionResult(parentFile.id, {
      extractedText: manifest,
      extractionError:
        extraction.encryptedEntryCount > 0
          ? `${ARCHIVE_ENCRYPTED_ERROR_CODE}: ${String(extraction.encryptedEntryCount)} of ${String(extraction.fileEntryCount)} files are password-protected and were skipped`
          : null,
      status: FileIngestionStatus.COMPLETED,
    });

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
      `expandArchive: completed parentFileId=${parentFile.id} children=${String(childFileCount)} bytes=${String(extraction.totalExtractedBytes)} manifestChars=${String(manifest.length)}`,
    );
  }

  // Nothing in the archive could be read. The row is FAILED — it is not usable —
  // but it still carries the manifest, so a model attached to it says "this
  // archive is encrypted" instead of "this file could not be parsed".
  private async finalizeAllEncrypted(
    parentFile: File,
    manifest: string,
    encryptedCount: number,
  ): Promise<void> {
    const errorMessage = `${ARCHIVE_ENCRYPTED_ERROR_CODE}: all ${String(encryptedCount)} files are password-protected`;
    this.logger.warn(`expandArchive: parentFileId=${parentFile.id} ${errorMessage}`);
    await this.filesRepository.saveExtractionResult(parentFile.id, {
      extractedText: manifest,
      extractionError: errorMessage,
      status: FileIngestionStatus.FAILED,
    });
    this.publishFailure(parentFile, errorMessage);
  }

  private async handleExtractionFailure(parentFile: File, error: unknown): Promise<void> {
    const errorMessage = error instanceof Error ? error.message : 'Unknown ZIP expansion error';
    const code = error instanceof BusinessException ? error.code : ZIP_EXPANSION_FAILED_ERROR_CODE;
    this.logger.error(
      `expandArchive: parentFileId=${parentFile.id} failed code=${code} message=${errorMessage}`,
    );

    // The reason is stored with the status, as for any other file, so a model
    // attached to a rejected archive can tell the user why.
    await this.filesRepository.saveExtractionResult(parentFile.id, {
      extractedText: null,
      extractionError: `${code}: ${errorMessage}`,
      status: FileIngestionStatus.FAILED,
    });
    this.publishFailure(parentFile, `${code}: ${errorMessage}`);
  }

  private publishFailure(parentFile: File, errorMessage: string): void {
    const payload: FileFailedPayload = {
      fileId: parentFile.id,
      userId: parentFile.userId,
      filename: parentFile.filename,
      errorMessage,
      failureStage: 'EXTRACTION',
      timestamp: new Date().toISOString(),
    };
    void this.rabbitMQService.publish(EventPattern.FILE_FAILED, payload);
  }
}
