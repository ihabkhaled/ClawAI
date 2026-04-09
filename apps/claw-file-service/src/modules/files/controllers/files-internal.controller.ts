import { Body, Controller, Get, Param, Post, Res } from '@nestjs/common';
import { type Response } from 'express';
import { Public } from '../../../app/decorators/public.decorator';
import { type FileChunk } from '../../../generated/prisma';
import { FileChunksRepository } from '../repositories/file-chunks.repository';
import { FilesRepository } from '../repositories/files.repository';
import { FilesService } from '../services/files.service';

@Controller('internal/files')
export class FilesInternalController {
  constructor(
    private readonly fileChunksRepository: FileChunksRepository,
    private readonly filesRepository: FilesRepository,
    private readonly filesService: FilesService,
  ) {}

  @Public()
  @Get(':id/chunks')
  async getChunks(@Param('id') fileId: string): Promise<FileChunk[]> {
    return this.fileChunksRepository.findByFileId(fileId);
  }

  @Public()
  @Get(':id/content')
  async getContent(
    @Param('id') fileId: string,
  ): Promise<{ id: string; filename: string; mimeType: string; content: string | null }> {
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

  @Public()
  @Get('download/:id')
  async download(@Param('id') id: string, @Res() res: Response): Promise<void> {
    return this.filesService.downloadFilePublic(id, res);
  }

  @Public()
  @Post('store-image')
  async storeImage(
    @Body() body: { userId: string; filename: string; mimeType: string; base64Data: string },
  ): Promise<{ fileId: string }> {
    return this.filesService.storeImage(body);
  }
}
