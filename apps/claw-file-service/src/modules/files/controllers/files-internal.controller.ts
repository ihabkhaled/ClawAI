import { Controller, Get, Param } from "@nestjs/common";
import { Public } from "../../../app/decorators/public.decorator";
import { type FileChunk } from "../../../generated/prisma";
import { FileChunksRepository } from "../repositories/file-chunks.repository";
import { FilesRepository } from "../repositories/files.repository";

@Controller("internal/files")
export class FilesInternalController {
  constructor(
    private readonly fileChunksRepository: FileChunksRepository,
    private readonly filesRepository: FilesRepository,
  ) {}

  @Public()
  @Get(":id/chunks")
  async getChunks(@Param("id") fileId: string): Promise<FileChunk[]> {
    return this.fileChunksRepository.findByFileId(fileId);
  }

  @Public()
  @Get(":id/content")
  async getContent(@Param("id") fileId: string): Promise<{ id: string; filename: string; mimeType: string; content: string | null }> {
    const file = await this.filesRepository.findById(fileId);
    if (!file) {
      return { id: fileId, filename: '', mimeType: '', content: null };
    }
    return {
      id: file.id,
      filename: file.filename,
      mimeType: file.mimeType,
      content: file.content,
    };
  }
}
