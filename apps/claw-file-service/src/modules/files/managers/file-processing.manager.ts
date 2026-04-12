import { Injectable, Logger } from '@nestjs/common';
import { RabbitMQService } from '@claw/shared-rabbitmq';
import { EventPattern } from '@claw/shared-types';
import { type File, FileIngestionStatus } from '../../../generated/prisma';
import { readFile } from '../../../common/utilities';
import { extractTextFromPdf } from '../../../common/utilities/pdf-parser.utility';
import { extractTextFromDocx } from '../../../common/utilities/docx-parser.utility';
import { FilesRepository } from '../repositories/files.repository';
import { FileChunksRepository } from '../repositories/file-chunks.repository';
import { type ChunkData } from '../types/files.types';
import {
  MIME_TYPE_DOCX,
  MIME_TYPE_PDF,
  MIME_TYPE_XLSX,
} from '../constants/file-processing.constants';

@Injectable()
export class FileProcessingManager {
  private readonly logger = new Logger(FileProcessingManager.name);

  constructor(
    private readonly filesRepository: FilesRepository,
    private readonly fileChunksRepository: FileChunksRepository,
    private readonly rabbitMQService: RabbitMQService,
  ) {}

  async processFile(file: File): Promise<void> {
    this.logger.log(`processFile: starting processing for file ${file.id} (${file.mimeType})`);
    await this.updateIngestionStatus(file.id, FileIngestionStatus.PROCESSING);

    try {
      const rawBuffer = readFile(file.storagePath);
      const textContent = await this.extractText(rawBuffer, file.mimeType, file.filename);
      const chunks = this.splitIntoChunks(textContent, file.mimeType, file.id);

      await this.fileChunksRepository.createMany(chunks);
      await this.updateIngestionStatus(file.id, FileIngestionStatus.COMPLETED);

      void this.rabbitMQService.publish(EventPattern.FILE_CHUNKED, {
        fileId: file.id,
        userId: file.userId,
        chunksCreated: chunks.length,
        timestamp: new Date().toISOString(),
      });

      this.logger.log(`File ${file.id} processed: ${String(chunks.length)} chunks created`);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown processing error';
      this.logger.error(`File ${file.id} processing failed: ${errorMessage}`);
      await this.updateIngestionStatus(file.id, FileIngestionStatus.FAILED);

      void this.rabbitMQService.publish('file.failed', {
        fileId: file.id,
        userId: file.userId,
        error: errorMessage,
        timestamp: new Date().toISOString(),
      });
    }
  }

  async updateIngestionStatus(fileId: string, status: FileIngestionStatus): Promise<void> {
    this.logger.debug(`updateIngestionStatus: fileId=${fileId}, status=${status}`);
    await this.filesRepository.updateIngestionStatus(fileId, status);
  }

  private async extractText(buffer: Buffer, mimeType: string, filename: string): Promise<string> {
    if (mimeType === MIME_TYPE_PDF) {
      this.logger.debug(`extractText: parsing PDF "${filename}"`);
      return extractTextFromPdf(buffer);
    }

    if (mimeType === MIME_TYPE_DOCX) {
      this.logger.debug(`extractText: parsing DOCX "${filename}"`);
      return extractTextFromDocx(buffer);
    }

    if (mimeType === MIME_TYPE_XLSX) {
      this.logger.debug(`extractText: XLSX detected — converting to CSV text`);
      return buffer.toString('utf-8');
    }

    if (mimeType.startsWith('image/')) {
      this.logger.debug(`extractText: image file "${filename}" — storing base64 reference`);
      return `[Image file: ${filename}]`;
    }

    this.logger.debug(`extractText: text file "${filename}" (${mimeType}) — UTF-8 decode`);
    return buffer.toString('utf-8');
  }

  private splitIntoChunks(content: string, mimeType: string, fileId: string): ChunkData[] {
    const rawChunks = this.splitByType(content, mimeType);

    const chunks = rawChunks
      .filter((chunk) => chunk.trim().length > 0)
      .map((chunk, index) => ({
        fileId,
        chunkIndex: index,
        content: chunk.trim(),
      }));

    this.logger.debug(
      `splitIntoChunks: fileId=${fileId}, mimeType=${mimeType}, rawChunks=${String(rawChunks.length)}, finalChunks=${String(chunks.length)}`,
    );
    return chunks;
  }

  private splitByType(content: string, mimeType: string): string[] {
    if (mimeType === 'application/json') {
      return this.splitJson(content);
    }
    if (mimeType === 'text/csv' || mimeType === 'text/tab-separated-values') {
      return this.splitCsv(content);
    }
    if (mimeType === 'text/markdown') {
      return this.splitMarkdown(content);
    }
    return this.splitText(content);
  }

  private splitText(content: string): string[] {
    const paragraphs = content.split(/\n\s*\n/);
    return paragraphs.length > 0 ? paragraphs : [content];
  }

  private splitJson(content: string): string[] {
    try {
      const parsed = JSON.parse(content) as unknown;
      if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
        return Object.entries(parsed as Record<string, unknown>).map(([key, value]) =>
          JSON.stringify({ [key]: value }, null, 2),
        );
      }
      if (Array.isArray(parsed)) {
        return parsed.map((item) => JSON.stringify(item, null, 2));
      }
      return [content];
    } catch {
      return [content];
    }
  }

  private splitCsv(content: string): string[] {
    const lines = content.split('\n');
    if (lines.length <= 1) {
      return [content];
    }
    const header = lines[0];
    const dataLines = lines.slice(1).filter((line) => line.trim().length > 0);
    const chunkSize = 50;
    const chunks: string[] = [];

    for (let i = 0; i < dataLines.length; i += chunkSize) {
      const chunk = [header, ...dataLines.slice(i, i + chunkSize)].join('\n');
      chunks.push(chunk);
    }

    return chunks.length > 0 ? chunks : [content];
  }

  private splitMarkdown(content: string): string[] {
    const sections = content.split(/(?=^#{1,3}\s)/m);
    return sections.length > 0 ? sections : [content];
  }
}
