import { Controller, Get, Param } from "@nestjs/common";
import { Public } from "../../../app/decorators/public.decorator";
import { type FileChunk } from "../../../generated/prisma";
import { FileChunksRepository } from "../repositories/file-chunks.repository";

@Controller("internal/files")
export class FilesInternalController {
  constructor(private readonly fileChunksRepository: FileChunksRepository) {}

  @Public()
  @Get(":id/chunks")
  async getChunks(@Param("id") fileId: string): Promise<FileChunk[]> {
    return this.fileChunksRepository.findByFileId(fileId);
  }
}
