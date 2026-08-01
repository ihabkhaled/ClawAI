import { HttpStatus, Injectable, Logger } from '@nestjs/common';
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
import { type File, type FileChunk } from '../../../generated/prisma';
import { BusinessException, EntityNotFoundException } from '../../../common/errors';
import { deleteFile, readFile, saveFile } from '../../../common/utilities';
import { type PaginatedResult } from '../../../common/types';
import { AppConfig } from '../../../app/config/app.config';
import { FilesRepository } from '../repositories/files.repository';
import { FileChunksRepository } from '../repositories/file-chunks.repository';
import { FileSecurityManager } from '../managers/file-security.manager';
import { type UploadFileDto } from '../dto/upload-file.dto';
import { type ListFilesQueryDto } from '../dto/list-files-query.dto';
import {
  type CreateInternalFileBody,
  type InternalFileContentResponse,
} from '../types/internal-file.types';
import { ALLOWED_MIME_TYPES, MAX_FILE_SIZE } from '../types/files.types';

@Injectable()
export class FilesService {
  private readonly logger = new Logger(FilesService.name);

  constructor(
    private readonly filesRepository: FilesRepository,
    private readonly fileChunksRepository: FileChunksRepository,
    private readonly rabbitMQService: RabbitMQService,
    private readonly fileSecurityManager: FileSecurityManager,
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

    return file;
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
    return {
      id: file.id,
      filename: file.filename,
      mimeType: file.mimeType,
      content: file.content,
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
  private computeRetentionExpiry(): Date | null {
    const days = AppConfig.get().FILE_RETENTION_DAYS;
    if (days === 0) {
      return null;
    }
    const millisPerDay = 24 * 60 * 60 * 1000;
    return new Date(Date.now() + days * millisPerDay);
  }
}
