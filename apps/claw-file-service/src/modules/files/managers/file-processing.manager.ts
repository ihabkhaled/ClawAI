import { Injectable, Logger } from "@nestjs/common";
import { RabbitMQService } from "@claw/shared-rabbitmq";
import { EventPattern } from "@claw/shared-types";
import { type File, FileIngestionStatus } from "../../../generated/prisma";
import { readFile } from "../../../common/utilities";
import { FilesRepository } from "../repositories/files.repository";
import { FileChunksRepository } from "../repositories/file-chunks.repository";
import { type ChunkData } from "../types/files.types";

@Injectable()
export class FileProcessingManager {
  private readonly logger = new Logger(FileProcessingManager.name);

  constructor(
    private readonly filesRepository: FilesRepository,
    private readonly fileChunksRepository: FileChunksRepository,
    private readonly rabbitMQService: RabbitMQService,
  ) {}

  async processFile(file: File): Promise<void> {
    await this.updateIngestionStatus(file.id, FileIngestionStatus.PROCESSING);

    try {
      const content = readFile(file.storagePath);
      const textContent = content.toString("utf-8");
      const chunks = this.splitIntoChunks(textContent, file.mimeType, file.id);

      await this.fileChunksRepository.createMany(chunks);
      await this.updateIngestionStatus(file.id, FileIngestionStatus.COMPLETED);

      void this.rabbitMQService.publish(EventPattern.FILE_CHUNKED, {
        fileId: file.id,
        userId: file.userId,
        chunksCreated: chunks.length,
        timestamp: new Date().toISOString(),
      });

      this.logger.log(`File ${file.id} processed: ${chunks.length} chunks created`);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Unknown processing error";
      this.logger.error(`File ${file.id} processing failed: ${errorMessage}`);
      await this.updateIngestionStatus(file.id, FileIngestionStatus.FAILED);

      void this.rabbitMQService.publish("file.failed", {
        fileId: file.id,
        userId: file.userId,
        error: errorMessage,
        timestamp: new Date().toISOString(),
      });
    }
  }

  async updateIngestionStatus(fileId: string, status: FileIngestionStatus): Promise<void> {
    await this.filesRepository.updateIngestionStatus(fileId, status);
  }

  private splitIntoChunks(content: string, mimeType: string, fileId: string): ChunkData[] {
    const rawChunks = this.splitByType(content, mimeType);

    return rawChunks
      .filter((chunk) => chunk.trim().length > 0)
      .map((chunk, index) => ({
        fileId,
        chunkIndex: index,
        content: chunk.trim(),
      }));
  }

  private splitByType(content: string, mimeType: string): string[] {
    switch (mimeType) {
      case "application/json":
        return this.splitJson(content);
      case "text/csv":
        return this.splitCsv(content);
      case "text/markdown":
        return this.splitMarkdown(content);
      default:
        return this.splitText(content);
    }
  }

  private splitText(content: string): string[] {
    const paragraphs = content.split(/\n\s*\n/);
    return paragraphs.length > 0 ? paragraphs : [content];
  }

  private splitJson(content: string): string[] {
    try {
      const parsed = JSON.parse(content) as unknown;
      if (typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)) {
        return Object.entries(parsed as Record<string, unknown>).map(
          ([key, value]) => JSON.stringify({ [key]: value }, null, 2),
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
    const lines = content.split("\n");
    if (lines.length <= 1) {
      return [content];
    }
    const header = lines[0];
    const dataLines = lines.slice(1).filter((line) => line.trim().length > 0);
    const chunkSize = 50;
    const chunks: string[] = [];

    for (let i = 0; i < dataLines.length; i += chunkSize) {
      const chunk = [header, ...dataLines.slice(i, i + chunkSize)].join("\n");
      chunks.push(chunk);
    }

    return chunks.length > 0 ? chunks : [content];
  }

  private splitMarkdown(content: string): string[] {
    const sections = content.split(/(?=^#{1,3}\s)/m);
    return sections.length > 0 ? sections : [content];
  }
}
