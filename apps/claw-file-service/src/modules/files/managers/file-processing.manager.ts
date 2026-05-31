import { forwardRef, Inject, Injectable, Logger } from '@nestjs/common';
import { RabbitMQService } from '@claw/shared-rabbitmq';
import {
  EventPattern,
  type FileChunkedPayload,
  type FileExtractionFailedPayload,
  type FileFailedPayload,
  type FileOcrCompletedPayload,
  type FileOcrFailedPayload,
  type FileOcrFailureStage,
  type FileOcrStartedPayload,
  FileIngestionStatus as SharedFileIngestionStatus,
} from '@claw/shared-types';
import { type File, FileIngestionStatus } from '../../../generated/prisma';
import { readFile } from '../../../common/utilities';
import { extractTextFromPdf } from '../../../common/utilities/pdf-parser.utility';
import { extractTextFromDocx } from '../../../common/utilities/docx-parser.utility';
import { extractTextFromImage } from '../../../common/utilities/ocr-parser.utility';
import { AppConfig } from '../../../app/config/app.config';
import { FilesRepository } from '../repositories/files.repository';
import { FileChunksRepository } from '../repositories/file-chunks.repository';
import { type ChunkData } from '../types/files.types';
import {
  MIME_TYPE_DOCX,
  MIME_TYPE_PDF,
  MIME_TYPE_XLSX,
} from '../constants/file-processing.constants';
import { ZIP_MIME_TYPES } from '../constants/zip-expansion.constants';
import { ZipExpansionManager } from './zip-expansion.manager';

@Injectable()
export class FileProcessingManager {
  private readonly logger = new Logger(FileProcessingManager.name);

  constructor(
    private readonly filesRepository: FilesRepository,
    private readonly fileChunksRepository: FileChunksRepository,
    private readonly rabbitMQService: RabbitMQService,
    @Inject(forwardRef(() => ZipExpansionManager))
    private readonly zipExpansionManager: ZipExpansionManager,
  ) {}

  async processFile(file: File): Promise<void> {
    this.logger.log(`processFile: starting processing for file ${file.id} (${file.mimeType})`);

    if (ZIP_MIME_TYPES.includes(file.mimeType)) {
      this.logger.debug(`processFile: routing fileId=${file.id} to ZipExpansionManager`);
      await this.zipExpansionManager.expandArchive(file);
      return;
    }

    await this.updateIngestionStatus(file.id, FileIngestionStatus.PROCESSING);

    try {
      const rawBuffer = readFile(file.storagePath);
      const textContent = await this.extractText(rawBuffer, file, file.storagePath);
      const chunks = this.splitIntoChunks(textContent, file.mimeType, file.id);

      await this.fileChunksRepository.createMany(chunks);
      await this.updateIngestionStatus(file.id, FileIngestionStatus.COMPLETED);

      const chunkedPayload: FileChunkedPayload = {
        fileId: file.id,
        chunkCount: chunks.length,
        status: SharedFileIngestionStatus.COMPLETED,
        timestamp: new Date().toISOString(),
      };
      void this.rabbitMQService.publish(EventPattern.FILE_CHUNKED, chunkedPayload);

      this.logger.log(`File ${file.id} processed: ${String(chunks.length)} chunks created`);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown processing error';
      this.logger.error(`File ${file.id} processing failed: ${errorMessage}`);
      await this.updateIngestionStatus(file.id, FileIngestionStatus.FAILED);
      this.publishExtractionFailure(file, errorMessage);
    }
  }

  async updateIngestionStatus(fileId: string, status: FileIngestionStatus): Promise<void> {
    this.logger.debug(`updateIngestionStatus: fileId=${fileId}, status=${status}`);
    await this.filesRepository.updateIngestionStatus(fileId, status);
  }

  private async extractText(buffer: Buffer, file: File, storagePath: string): Promise<string> {
    const { mimeType, filename } = file;

    if (mimeType === MIME_TYPE_PDF) {
      return this.extractPdfText(buffer, file, storagePath);
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
      return this.extractImageText(file, storagePath);
    }

    this.logger.debug(`extractText: text file "${filename}" (${mimeType}) — UTF-8 decode`);
    return buffer.toString('utf-8');
  }

  // Slice D backend 3 — PDF extraction with OCR fallback for scanned PDFs.
  // The pdf-parser utility returns { text, isScanned } where isScanned means
  // the text layer is too short to be real content. When OCR is enabled we
  // route the same file through tesseract; otherwise we keep the original
  // (possibly empty) text so existing behaviour is preserved.
  private async extractPdfText(buffer: Buffer, file: File, storagePath: string): Promise<string> {
    const cfg = AppConfig.get();
    const { text, isScanned } = await extractTextFromPdf(buffer, cfg.SCANNED_PDF_CHAR_THRESHOLD);
    this.logger.debug(
      `extractPdfText: fileId=${file.id} chars=${String(text.length)} isScanned=${String(isScanned)} ocrEnabled=${String(cfg.OCR_ENABLED)}`,
    );
    if (!isScanned || !cfg.OCR_ENABLED) {
      return text;
    }
    return this.runOcrFallback(file, storagePath, true);
  }

  // Slice D backend 3 — Image OCR branch.
  // Off by default (OCR_ENABLED=false → returns the legacy placeholder so
  // image attachments still appear in chunks the way they did pre-Slice D).
  private async extractImageText(file: File, storagePath: string): Promise<string> {
    const cfg = AppConfig.get();
    if (!cfg.OCR_ENABLED) {
      this.logger.debug(`extractImageText: OCR disabled — fileId=${file.id} placeholder only`);
      return `[Image file: ${file.filename}]`;
    }
    return this.runOcrFallback(file, storagePath, false);
  }

  // Single OCR entry-point: publishes FILE_OCR_STARTED → FILE_OCR_COMPLETED
  // (or FILE_OCR_FAILED on error). Returns the OCR text on success; on
  // failure returns a safe placeholder so chunking still emits a row.
  private async runOcrFallback(
    file: File,
    storagePath: string,
    isScannedPdf: boolean,
  ): Promise<string> {
    const cfg = AppConfig.get();
    const startedPayload: FileOcrStartedPayload = {
      fileId: file.id,
      userId: file.userId,
      mimeType: file.mimeType,
      isImageFile: file.mimeType.startsWith('image/'),
      isScannedPdf,
      timestamp: new Date().toISOString(),
    };
    void this.rabbitMQService.publish(EventPattern.FILE_OCR_STARTED, startedPayload);

    try {
      const result = await extractTextFromImage(storagePath, file.mimeType, {
        language: cfg.OCR_LANGUAGE,
        timeoutMs: cfg.OCR_TIMEOUT_MS,
        confidenceMin: cfg.OCR_CONFIDENCE_MIN,
        workerThreads: cfg.OCR_WORKER_THREADS,
      });
      const completedPayload: FileOcrCompletedPayload = {
        fileId: file.id,
        userId: file.userId,
        extractedTextLength: result.text.length,
        confidence: result.confidence,
        durationMs: result.durationMs,
        timestamp: new Date().toISOString(),
      };
      void this.rabbitMQService.publish(EventPattern.FILE_OCR_COMPLETED, completedPayload);
      this.logger.log(
        `runOcrFallback: fileId=${file.id} chars=${String(result.text.length)} confidence=${result.confidence.toFixed(2)}`,
      );
      return result.text.length > 0 ? result.text : `[Image file: ${file.filename}]`;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'OCR failed';
      const stage: FileOcrFailureStage = errorMessage.toLowerCase().includes('timed out')
        ? 'TIMEOUT'
        : 'PROCESSING';
      const failedPayload: FileOcrFailedPayload = {
        fileId: file.id,
        userId: file.userId,
        errorMessage,
        failureStage: stage,
        timestamp: new Date().toISOString(),
      };
      void this.rabbitMQService.publish(EventPattern.FILE_OCR_FAILED, failedPayload);
      this.logger.error(`runOcrFallback: fileId=${file.id} stage=${stage} — ${errorMessage}`);
      return `[Image file: ${file.filename}]`;
    }
  }

  // Slice D backend 3 — extraction failure publisher.
  // Emits BOTH the new FILE_EXTRACTION_FAILED (more specific) and the legacy
  // FILE_FAILED (deprecated, kept for one cycle for backward compat).
  private publishExtractionFailure(file: File, errorMessage: string): void {
    const extractionPayload: FileExtractionFailedPayload = {
      fileId: file.id,
      userId: file.userId,
      filename: file.filename,
      errorMessage,
      failureStage: 'PARSE',
      timestamp: new Date().toISOString(),
    };
    void this.rabbitMQService.publish(EventPattern.FILE_EXTRACTION_FAILED, extractionPayload);

    const legacyPayload: FileFailedPayload = {
      fileId: file.id,
      userId: file.userId,
      filename: file.filename,
      errorMessage,
      failureStage: 'EXTRACTION',
      timestamp: new Date().toISOString(),
    };
    void this.rabbitMQService.publish(EventPattern.FILE_FAILED, legacyPayload);
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
