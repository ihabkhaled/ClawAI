import { forwardRef, HttpStatus, Inject, Injectable, Logger } from '@nestjs/common';
import { type Response } from 'express';
import { RabbitMQService } from '@claw/shared-rabbitmq';
import {
  EventPattern,
  type FileDeletedPayload,
  type FileDeletionReason,
  type FileDownloadedPayload,
  type FileDownloadMethod,
  type FileUploadCompletedPayload,
  type FileUploadStartedPayload,
} from '@claw/shared-types';
import { type File, type FileChunk, FileIngestionStatus } from '../../../generated/prisma';
import { BusinessException, EntityNotFoundException } from '../../../common/errors';
import { deleteFile, readFile, saveFile } from '../../../common/utilities';
import {
  MAX_PUBLISHED_COPY_BYTES,
  PUBLISHABLE_COPY_MIME_PREFIX,
} from '../constants/published-copy.constants';
import { EXTRACTION_REQUIRED_MIME_TYPES } from '../constants/file-processing.constants';
import { type PublishedCopyResult } from '../types/published-copy.types';
import { type PaginatedResult } from '../../../common/types';
import { AppConfig } from '../../../app/config/app.config';
import { FilesRepository } from '../repositories/files.repository';
import { FileChunksRepository } from '../repositories/file-chunks.repository';
import { FileSecurityManager } from '../managers/file-security.manager';
import { type UploadFileDto } from '../dto/upload-file.dto';
import { type ListFilesQueryDto } from '../dto/list-files-query.dto';
import {
  type CreateInternalFileBody,
  type FileIngestionState,
  type InternalFileContentResponse,
} from '../types/internal-file.types';
import { ALLOWED_MIME_TYPES, MAX_FILE_SIZE } from '../types/files.types';
import { FileProcessingManager } from '../managers/file-processing.manager';
import { type FileProcessingContract } from '../types/zip-expansion.types';

@Injectable()
export class FilesService {
  private readonly logger = new Logger(FilesService.name);

  constructor(
    private readonly filesRepository: FilesRepository,
    private readonly fileChunksRepository: FileChunksRepository,
    private readonly rabbitMQService: RabbitMQService,
    private readonly fileSecurityManager: FileSecurityManager,
    // Typed as the contract rather than the class for the same ESM reason
    // documented on FileProcessingContract: a class-typed parameter is emitted
    // into `design:paramtypes` and read while the module graph is still
    // evaluating. Do not widen it back to the class type.
    @Inject(forwardRef(() => FileProcessingManager))
    private readonly fileProcessingManager: FileProcessingContract,
  ) {}

  /**
   * Stream 22 — service-to-service upload entry-point used by
   * claw-workspace-service for Gmail attachments. Runs the full
   * FileSecurityManager pipeline (ClamAV + magic byte + extension blocklist).
   */
  async createInternalFile(body: CreateInternalFileBody): Promise<File> {
    this.logger.log(
      `createInternalFile: ingest "${body.filename}" mimeType=${body.mimeType} sourceObjectId=${body.sourceWorkspaceObjectId ?? 'none'}`,
    );
    this.validateMimeType(body.mimeType);
    const buffer = Buffer.from(body.contentBase64, 'base64');
    this.validateFileSize(buffer.length);
    await this.runSecurityChecks(body.filename, body.mimeType, buffer);
    const safeName = this.fileSecurityManager.getSanitizedFilename(body.filename);
    const storagePath = saveFile(`${String(Date.now())}-${safeName}`, buffer);
    const file = await this.filesRepository.create({
      userId: body.userId,
      filename: safeName,
      mimeType: body.mimeType,
      sizeBytes: buffer.length,
      storagePath,
      content: body.contentBase64,
      retentionExpiresAt: this.computeRetentionExpiry(),
    });
    this.publishUploadCompleted(file);
    this.startExtraction(file);
    return file;
  }

  async uploadFile(userId: string, dto: UploadFileDto): Promise<File> {
    this.logger.log(
      `uploadFile: uploading file "${dto.filename}" (${dto.mimeType}, ${String(dto.sizeBytes)} bytes) for user ${userId}`,
    );
    this.validateMimeType(dto.mimeType);
    this.validateFileSize(dto.sizeBytes);
    const contentBuffer = dto.content ? Buffer.from(dto.content, 'base64') : Buffer.alloc(0);
    this.validateDecodedFileSize(dto.sizeBytes, contentBuffer.length);

    this.publishUploadStarted({
      // fileId is unknown until the row is created — use empty string until then;
      // the started event still carries enough metadata (user + filename +
      // mimeType + size) for the audit trail.
      fileId: '',
      userId,
      filename: dto.filename,
      mimeType: dto.mimeType,
      sizeBytes: contentBuffer.length,
    });

    await this.runSecurityChecks(dto.filename, dto.mimeType, contentBuffer);

    const safeName = this.fileSecurityManager.getSanitizedFilename(dto.filename);
    const storagePath = saveFile(`${String(Date.now())}-${safeName}`, contentBuffer);

    const file = await this.filesRepository.create({
      userId,
      filename: safeName,
      mimeType: dto.mimeType,
      sizeBytes: contentBuffer.length,
      storagePath,
      content: dto.content ?? null,
      retentionExpiresAt: this.computeRetentionExpiry(),
    });

    this.logger.log(`uploadFile: uploaded file ${file.id} "${safeName}" (security checks passed)`);
    this.publishUploadCompleted(file);
    this.startExtraction(file);

    return file;
  }

  /**
   * Kicks off text extraction for a freshly stored file.
   *
   * Deliberately not awaited. OCR on a scanned PDF runs to the OCR_TIMEOUT_MS
   * ceiling (30s by default), and holding the upload response open for that long
   * would break the picker. The row is created PENDING and the manager drives it
   * to COMPLETED or FAILED; readers wait on that status rather than on this call.
   *
   * This is the wiring whose absence caused every "I can't read the attached
   * file" reply: FileProcessingManager existed and was correct, but nothing on
   * the upload path ever called it.
   */
  private startExtraction(file: File): void {
    void this.fileProcessingManager.processFile(file).catch((error: unknown) => {
      // processFile already records FAILED and publishes the failure event; this
      // catch exists only so an unexpected throw cannot become an unhandled
      // rejection and take the process down.
      const message = error instanceof Error ? error.message : 'Unknown extraction error';
      this.logger.error(
        `startExtraction: fileId=${file.id} threw outside processFile — ${message}`,
      );
    });
  }

  private publishUploadStarted(args: {
    fileId: string;
    userId: string;
    filename: string;
    mimeType: string;
    sizeBytes: number;
  }): void {
    const payload: FileUploadStartedPayload = {
      fileId: args.fileId,
      userId: args.userId,
      filename: args.filename,
      mimeType: args.mimeType,
      sizeBytes: args.sizeBytes,
      timestamp: new Date().toISOString(),
    };
    void this.rabbitMQService.publish(EventPattern.FILE_UPLOAD_STARTED, payload);
  }

  // Publishes BOTH the new FILE_UPLOAD_COMPLETED (canonical) and the legacy
  // FILE_UPLOADED (deprecated, kept for one release cycle). New consumers
  // should subscribe to FILE_UPLOAD_COMPLETED; existing consumers continue to
  // work without changes.
  private publishUploadCompleted(file: File): void {
    // The new + legacy payload shapes share the same field set (alias type in
    // shared-types). threadId is unknown at this layer — pass empty string.
    const completedPayload: FileUploadCompletedPayload = {
      fileId: file.id,
      threadId: '',
      userId: file.userId,
      fileName: file.filename,
      mimeType: file.mimeType,
      sizeBytes: file.sizeBytes,
      timestamp: new Date().toISOString(),
    };
    void this.rabbitMQService.publish(EventPattern.FILE_UPLOAD_COMPLETED, completedPayload);
    // Backward-compat — same payload shape, deprecated pattern.
    void this.rabbitMQService.publish(EventPattern.FILE_UPLOADED, completedPayload);
  }

  private async runSecurityChecks(
    filename: string,
    mimeType: string,
    buffer: Buffer,
  ): Promise<void> {
    const result = await this.fileSecurityManager.runAllChecks(filename, mimeType, buffer);
    if (!result.passed) {
      const failedChecks = result.checks.filter((c) => !c.passed);
      const reasons = failedChecks.map((c) => `${c.name}: ${c.reason}`).join('; ');
      this.logger.warn(`runSecurityChecks: REJECTED "${filename}" — ${reasons}`);
      throw new BusinessException(
        `File rejected by security checks: ${reasons}`,
        'FILE_SECURITY_CHECK_FAILED',
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }
  }

  async getFiles(userId: string, query: ListFilesQueryDto): Promise<PaginatedResult<File>> {
    this.logger.debug(
      `getFiles: listing files for user ${userId} — page=${String(query.page)}, limit=${String(query.limit)}, search=${query.search ?? 'none'}`,
    );
    const filters = {
      userId,
      ingestionStatus: query.ingestionStatus,
      search: query.search,
    };

    const [files, total] = await Promise.all([
      this.filesRepository.findAll(filters, query.page, query.limit),
      this.filesRepository.countAll(filters),
    ]);

    this.logger.debug(
      `getFiles: returned ${String(files.length)} of ${String(total)} files for user ${userId}`,
    );
    return {
      data: files,
      meta: {
        total,
        page: query.page,
        limit: query.limit,
        totalPages: Math.ceil(total / query.limit),
      },
    };
  }

  async getFile(id: string, userId: string): Promise<File> {
    this.logger.debug(`getFile: fetching file ${id} for user ${userId}`);
    const file = await this.filesRepository.findById(id);
    if (!file) {
      throw new EntityNotFoundException('File', id);
    }
    this.validateOwnership(file, userId);
    this.logger.debug(`getFile: found file ${id} "${file.filename}" (${file.mimeType})`);
    return file;
  }

  async getFileContent(id: string, userId: string): Promise<InternalFileContentResponse> {
    this.logger.debug(`getFileContent: fetching owned content for file ${id}, user ${userId}`);
    const file = await this.filesRepository.findById(id);
    if (file?.userId !== userId) {
      throw new EntityNotFoundException('File', id);
    }
    const status = this.healLegacyRowIfNeeded(file);
    return {
      id: file.id,
      filename: file.filename,
      mimeType: file.mimeType,
      content: file.content,
      extractedText: file.extractedText,
      ingestionStatus: status,
      extractionError: file.extractionError,
    };
  }

  /**
   * Re-extracts a row that predates the extraction pipeline, on first use.
   *
   * Every file uploaded before this pipeline was wired sits at COMPLETED with no
   * text, because the old schema defaulted the column to COMPLETED and nothing
   * ever ran. Those rows are not migrated in bulk: a migration that flipped them
   * all to PENDING would leave them PENDING forever, and the file-list poller
   * runs for as long as any row is unfinished.
   *
   * So history heals one file at a time, when someone actually attaches it. The
   * caller is told PROCESSING rather than COMPLETED, which routes it into the
   * same bounded wait a fresh upload uses.
   */
  private healLegacyRowIfNeeded(file: File): FileIngestionStatus {
    const alreadyResolved =
      file.ingestionStatus !== FileIngestionStatus.COMPLETED || file.extractedText !== null;
    if (alreadyResolved || !this.needsTextExtraction(file.mimeType)) {
      return file.ingestionStatus;
    }
    this.logger.log(
      `healLegacyRowIfNeeded: fileId=${file.id} predates extraction (${file.mimeType}) — re-extracting on demand`,
    );
    this.startExtraction(file);
    return FileIngestionStatus.PROCESSING;
  }

  // Text files were always readable as-is, so a legacy text row needs nothing.
  // Only formats whose bytes are meaningless to a model are worth re-running.
  private needsTextExtraction(mimeType: string): boolean {
    return (
      EXTRACTION_REQUIRED_MIME_TYPES.has(mimeType) ||
      mimeType.startsWith('image/') ||
      mimeType.startsWith('video/')
    );
  }

  /**
   * Whether extraction has finished, without shipping the text back.
   *
   * Chat-service polls this before assembling a turn, so a message sent the
   * instant an upload returns does not race the extractor. Kept separate from
   * {@link getFileContent} because a readiness poll must stay cheap — the text
   * for a large PDF is megabytes, and a caller checking a boolean should not
   * pay for it on every attempt.
   */
  async getIngestionState(id: string, userId: string): Promise<FileIngestionState> {
    const file = await this.filesRepository.findById(id);
    if (file?.userId !== userId) {
      throw new EntityNotFoundException('File', id);
    }
    return {
      id: file.id,
      filename: file.filename,
      mimeType: file.mimeType,
      ingestionStatus: file.ingestionStatus,
      extractionError: file.extractionError,
      extractedTextLength: file.extractedText?.length ?? 0,
    };
  }

  async deleteFile(id: string, userId: string): Promise<File> {
    this.logger.log(`deleteFile: deleting file ${id} for user ${userId}`);
    const file = await this.filesRepository.findById(id);
    if (!file) {
      throw new EntityNotFoundException('File', id);
    }
    this.validateOwnership(file, userId);

    await this.fileChunksRepository.deleteByFileId(id);

    try {
      deleteFile(file.storagePath);
    } catch {
      this.logger.warn(`deleteFile: failed to delete file from disk — path=${file.storagePath}`);
    }

    const deleted = await this.filesRepository.delete(id);
    this.logger.log(
      `deleteFile: completed — fileId=${id}, filename="${file.filename}", mimeType=${file.mimeType}, sizeBytes=${String(file.sizeBytes)}`,
    );
    this.publishFileDeleted(deleted, userId, 'USER');
    return deleted;
  }

  // Slice D backend 3 — file-deletion lifecycle event.
  // Published by user-driven deletes (reason='USER'). The retention sweeper
  // publishes its own FILE_DELETED via the FileRetentionSweeperManager so
  // every delete path lands a single canonical event in the audit trail.
  private publishFileDeleted(file: File, deletedBy: string, reason: FileDeletionReason): void {
    const payload: FileDeletedPayload = {
      fileId: file.id,
      userId: file.userId,
      filename: file.filename,
      deletedBy,
      reason,
      timestamp: new Date().toISOString(),
    };
    void this.rabbitMQService.publish(EventPattern.FILE_DELETED, payload);
  }

  async getChunks(id: string, userId: string): Promise<FileChunk[]> {
    this.logger.debug(`getChunks: fetching chunks for file ${id}, user ${userId}`);
    const file = await this.filesRepository.findById(id);
    if (!file) {
      throw new EntityNotFoundException('File', id);
    }
    this.validateOwnership(file, userId);

    const chunks = await this.fileChunksRepository.findByFileId(id);
    this.logger.debug(`getChunks: returned ${String(chunks.length)} chunks for file ${id}`);
    return chunks;
  }

  private validateMimeType(mimeType: string): void {
    if (!(ALLOWED_MIME_TYPES as readonly string[]).includes(mimeType)) {
      throw new BusinessException(
        `MIME type '${mimeType}' is not allowed. Allowed types: ${ALLOWED_MIME_TYPES.join(', ')}`,
        'INVALID_MIME_TYPE',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  private validateFileSize(sizeBytes: number): void {
    if (sizeBytes > MAX_FILE_SIZE) {
      throw new BusinessException(
        `File size ${sizeBytes} exceeds maximum of ${MAX_FILE_SIZE} bytes (50MB)`,
        'FILE_TOO_LARGE',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  private validateDecodedFileSize(declaredSizeBytes: number, decodedSizeBytes: number): void {
    this.validateFileSize(decodedSizeBytes);
    if (declaredSizeBytes !== decodedSizeBytes) {
      throw new BusinessException(
        `Declared file size ${String(declaredSizeBytes)} does not match decoded size ${String(decodedSizeBytes)}`,
        'FILE_SIZE_MISMATCH',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  async downloadFile(id: string, userId: string, res: Response): Promise<void> {
    this.logger.debug(`downloadFile: downloading file ${id}`);
    const file = await this.filesRepository.findById(id);
    if (!file) {
      throw new EntityNotFoundException('File', id);
    }
    this.validateOwnership(file, userId);

    const buffer = readFile(file.storagePath);
    const isImage = file.mimeType.startsWith('image/');
    const disposition = isImage ? 'inline' : 'attachment';

    res.set({
      'Content-Type': file.mimeType,
      'Content-Disposition': `${disposition}; filename="${file.filename}"`,
      'Content-Length': String(buffer.length),
      'Cache-Control': 'private, max-age=3600',
    });
    res.send(buffer);
    this.logger.debug(
      `downloadFile: completed — fileId=${id}, filename="${file.filename}", bytes=${String(buffer.length)}`,
    );
    this.publishFileDownloaded(file, userId, 'BROWSER');
  }

  async downloadFilePublic(id: string, res: Response): Promise<void> {
    this.logger.debug(`downloadFilePublic: downloading public file ${id}`);
    const file = await this.filesRepository.findById(id);
    if (!file) {
      throw new EntityNotFoundException('File', id);
    }

    const buffer = readFile(file.storagePath);
    const isImage = file.mimeType.startsWith('image/');
    const disposition = isImage ? 'inline' : 'attachment';

    res.set({
      'Content-Type': file.mimeType,
      'Content-Disposition': `${disposition}; filename="${file.filename}"`,
      'Content-Length': String(buffer.length),
      'Cache-Control': 'public, max-age=86400',
    });
    res.send(buffer);
    this.logger.debug(
      `downloadFilePublic: completed — fileId=${id}, filename="${file.filename}", bytes=${String(buffer.length)}`,
    );
    // Internal route — downloadedBy is 'system' (the service token).
    this.publishFileDownloaded(file, 'system', 'INTERNAL_API');
  }

  // Slice D backend 3 — file-download lifecycle event.
  // downloadMethod = 'BROWSER' for the user-facing /files/download/:id route,
  // 'INTERNAL_API' for /internal/files/download/* + /download-internal/:id.
  private publishFileDownloaded(
    file: File,
    downloadedBy: string,
    downloadMethod: FileDownloadMethod,
  ): void {
    const payload: FileDownloadedPayload = {
      fileId: file.id,
      userId: file.userId,
      downloadedBy,
      downloadMethod,
      timestamp: new Date().toISOString(),
    };
    void this.rabbitMQService.publish(EventPattern.FILE_DOWNLOADED, payload);
  }

  async storeImage(data: {
    userId: string;
    filename: string;
    mimeType: string;
    base64Data: string;
  }): Promise<{ fileId: string }> {
    this.logger.log(
      `storeImage: storing image "${data.filename}" (${data.mimeType}) for user ${data.userId}`,
    );
    this.validateMimeType(data.mimeType);
    const contentBuffer = Buffer.from(data.base64Data, 'base64');
    this.validateFileSize(contentBuffer.length);
    await this.runSecurityChecks(data.filename, data.mimeType, contentBuffer);

    const safeName = this.fileSecurityManager.getSanitizedFilename(data.filename);
    const storagePath = saveFile(`${String(Date.now())}-${safeName}`, contentBuffer);

    const file = await this.filesRepository.create({
      userId: data.userId,
      filename: safeName,
      mimeType: data.mimeType,
      sizeBytes: contentBuffer.length,
      storagePath,
      content: data.base64Data,
      retentionExpiresAt: this.computeRetentionExpiry(),
    });

    this.logger.log(
      `storeImage: stored ${file.id} "${safeName}" (${String(contentBuffer.length)} bytes, security checks passed)`,
    );
    return { fileId: file.id };
  }

  private validateOwnership(file: File, userId: string): void {
    if (file.userId !== userId) {
      throw new BusinessException(
        'You do not have access to this file',
        'FORBIDDEN_FILE_ACCESS',
        HttpStatus.FORBIDDEN,
      );
    }
  }

  // Slice C foundation 3 — compute the retention expiry for a new upload.
  // Returns null when FILE_RETENTION_DAYS = 0 (retention disabled / keep forever),
  // otherwise returns a Date that is FILE_RETENTION_DAYS days in the future.
  /**
   * Copies a file into a permanent, share-owned duplicate.
   *
   * A public share must not hold a reference to the user's file. The retention
   * sweeper reaps by `retentionExpiresAt`, and the user may delete the original
   * at any time — either of which turns an already-indexed public page into a
   * 404. So the share gets its own row with **no expiry**, which the sweeper
   * skips, and deleting the share deletes the copy.
   *
   * The copy happens here rather than in chat-service so the bytes never leave
   * the service that owns storage: chat-service asks for a copy and receives an
   * id, not a base64 payload.
   *
   * Images only. A PDF on a public page is a different content-rights question
   * and does not get answered by accident here.
   *
   * See docs/13-adr/adr-075-public-share-assets.md.
   */
  async createPublishedCopy(sourceFileId: string): Promise<PublishedCopyResult | null> {
    const source = await this.filesRepository.findById(sourceFileId);
    if (!source) {
      this.logger.warn(`createPublishedCopy: source ${sourceFileId} not found`);
      return null;
    }
    if (!source.mimeType.startsWith(PUBLISHABLE_COPY_MIME_PREFIX)) {
      this.logger.warn(
        `createPublishedCopy: refusing non-image ${sourceFileId} (${source.mimeType})`,
      );
      return null;
    }
    if (source.sizeBytes > MAX_PUBLISHED_COPY_BYTES) {
      this.logger.warn(
        `createPublishedCopy: refusing oversized ${sourceFileId} (${String(source.sizeBytes)} bytes)`,
      );
      return null;
    }

    const buffer = readFile(source.storagePath);
    const storagePath = saveFile(`share-${String(Date.now())}-${source.filename}`, buffer);
    const copy = await this.filesRepository.create({
      userId: source.userId,
      filename: source.filename,
      mimeType: source.mimeType,
      sizeBytes: buffer.length,
      storagePath,
      content: source.content,
      // The whole point: no expiry, so the retention sweep never reaps it.
      retentionExpiresAt: null,
    });

    this.logger.log(`createPublishedCopy: ${sourceFileId} -> ${copy.id} (no retention)`);
    return { fileId: copy.id, mimeType: copy.mimeType, byteSize: copy.sizeBytes };
  }

  /**
   * Removes a share-owned copy, blob then row.
   *
   * Blob first for the same reason the retention sweeper does it that way: a
   * row without a blob is a recoverable inconsistency the next pass can finish,
   * while a blob without a row is unreachable garbage nobody will ever find.
   */
  async deletePublishedCopy(fileId: string): Promise<void> {
    const file = await this.filesRepository.findById(fileId);
    if (!file) {
      this.logger.debug(`deletePublishedCopy: ${fileId} already gone`);
      return;
    }
    deleteFile(file.storagePath);
    await this.filesRepository.deleteById(fileId);
    this.logger.log(`deletePublishedCopy: removed ${fileId}`);
  }

  private computeRetentionExpiry(): Date | null {
    const days = AppConfig.get().FILE_RETENTION_DAYS;
    if (days === 0) {
      return null;
    }
    const millisPerDay = 24 * 60 * 60 * 1000;
    return new Date(Date.now() + days * millisPerDay);
  }
}
