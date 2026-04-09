import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { type Response } from 'express';
import { RabbitMQService } from '@claw/shared-rabbitmq';
import { EventPattern } from '@claw/shared-types';
import { type File, type FileChunk } from '../../../generated/prisma';
import { BusinessException, EntityNotFoundException } from '../../../common/errors';
import { deleteFile, readFile, saveFile } from '../../../common/utilities';
import { type PaginatedResult } from '../../../common/types';
import { FilesRepository } from '../repositories/files.repository';
import { FileChunksRepository } from '../repositories/file-chunks.repository';
import { type UploadFileDto } from '../dto/upload-file.dto';
import { type ListFilesQueryDto } from '../dto/list-files-query.dto';
import { ALLOWED_MIME_TYPES, MAX_FILE_SIZE } from '../types/files.types';

@Injectable()
export class FilesService {
  private readonly logger = new Logger(FilesService.name);

  constructor(
    private readonly filesRepository: FilesRepository,
    private readonly fileChunksRepository: FileChunksRepository,
    private readonly rabbitMQService: RabbitMQService,
  ) {}

  async uploadFile(userId: string, dto: UploadFileDto): Promise<File> {
    this.validateMimeType(dto.mimeType);
    this.validateFileSize(dto.sizeBytes);

    const contentBuffer = dto.content ? Buffer.from(dto.content, 'base64') : Buffer.alloc(0);
    const storagePath = saveFile(`${Date.now()}-${dto.filename}`, contentBuffer);

    // Store file with raw content — LLMs parse files natively
    const file = await this.filesRepository.create({
      userId,
      filename: dto.filename,
      mimeType: dto.mimeType,
      sizeBytes: dto.sizeBytes,
      storagePath,
      content: dto.content ?? null,
    });

    void this.rabbitMQService.publish(EventPattern.FILE_UPLOADED, {
      fileId: file.id,
      userId,
      filename: file.filename,
      timestamp: new Date().toISOString(),
    });

    return file;
  }

  async getFiles(userId: string, query: ListFilesQueryDto): Promise<PaginatedResult<File>> {
    const filters = {
      userId,
      ingestionStatus: query.ingestionStatus,
      search: query.search,
    };

    const [files, total] = await Promise.all([
      this.filesRepository.findAll(filters, query.page, query.limit),
      this.filesRepository.countAll(filters),
    ]);

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
    const file = await this.filesRepository.findById(id);
    if (!file) {
      throw new EntityNotFoundException('File', id);
    }
    this.validateOwnership(file, userId);
    return file;
  }

  async deleteFile(id: string, userId: string): Promise<File> {
    const file = await this.filesRepository.findById(id);
    if (!file) {
      throw new EntityNotFoundException('File', id);
    }
    this.validateOwnership(file, userId);

    await this.fileChunksRepository.deleteByFileId(id);

    try {
      deleteFile(file.storagePath);
    } catch {
      this.logger.warn(`Failed to delete file from disk: ${file.storagePath}`);
    }

    return this.filesRepository.delete(id);
  }

  async getChunks(id: string, userId: string): Promise<FileChunk[]> {
    const file = await this.filesRepository.findById(id);
    if (!file) {
      throw new EntityNotFoundException('File', id);
    }
    this.validateOwnership(file, userId);

    return this.fileChunksRepository.findByFileId(id);
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

  async downloadFile(id: string, userId: string, res: Response): Promise<void> {
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
  }

  async storeImage(data: {
    userId: string;
    filename: string;
    mimeType: string;
    base64Data: string;
  }): Promise<{ fileId: string }> {
    this.validateMimeType(data.mimeType);
    const contentBuffer = Buffer.from(data.base64Data, 'base64');
    const storagePath = saveFile(`${Date.now()}-${data.filename}`, contentBuffer);

    const file = await this.filesRepository.create({
      userId: data.userId,
      filename: data.filename,
      mimeType: data.mimeType,
      sizeBytes: contentBuffer.length,
      storagePath,
    });

    this.logger.log(
      `Image stored: ${file.id} (${data.filename}, ${String(contentBuffer.length)} bytes)`,
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
}
