import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import { type Response } from 'express';
import { Public } from '../../../app/decorators/public.decorator';
import { ServiceTokenGuard } from '../../../app/guards/service-token.guard';
import { ZodValidationPipe } from '../../../app/pipes/zod-validation.pipe';
import { type File, type FileChunk } from '../../../generated/prisma';
import {
  type InternalFileContentQueryDto,
  internalFileContentQuerySchema,
} from '../dto/internal-file-content-query.dto';
import { type PublishCopyDto, publishCopySchema } from '../dto/publish-copy.dto';
import { FileChunksRepository } from '../repositories/file-chunks.repository';
import { FilesRepository } from '../repositories/files.repository';
import { FilesService } from '../services/files.service';
import type {
  CreateInternalFileBody,
  InternalFileContentResponse,
} from '../types/internal-file.types';
import { type PublishedCopyResult } from '../types/published-copy.types';

@Controller('internal/files')
export class FilesInternalController {
  constructor(
    private readonly fileChunksRepository: FileChunksRepository,
    private readonly filesRepository: FilesRepository,
    private readonly filesService: FilesService,
  ) {}

  @Public()
  @UseGuards(ServiceTokenGuard)
  @Get(':id/chunks')
  async getChunks(@Param('id') fileId: string): Promise<FileChunk[]> {
    return this.fileChunksRepository.findByFileId(fileId);
  }

  @Public()
  @UseGuards(ServiceTokenGuard)
  @Get(':id/content')
  async getContent(
    @Param('id') fileId: string,
    @Query(new ZodValidationPipe(internalFileContentQuerySchema))
    query: InternalFileContentQueryDto,
  ): Promise<InternalFileContentResponse> {
    return this.filesService.getFileContent(fileId, query.userId);
  }

  @Public()
  @UseGuards(ServiceTokenGuard)
  @Get('download/:id')
  async download(@Param('id') id: string, @Res() res: Response): Promise<void> {
    return this.filesService.downloadFilePublic(id, res);
  }

  @Public()
  @UseGuards(ServiceTokenGuard)
  @Post('store-image')
  async storeImage(
    @Body() body: { userId: string; filename: string; mimeType: string; base64Data: string },
  ): Promise<{ fileId: string }> {
    return this.filesService.storeImage(body);
  }

  /**
   * Stream 22 — internal upload endpoint used by claw-workspace-service to
   * persist Gmail attachments. Auth via service-token shared secret. Runs the
   * full FileSecurityManager pipeline (ClamAV + magic bytes + extension blocklist).
   */
  @Public()
  @UseGuards(ServiceTokenGuard)
  @Post('upload-internal')
  @HttpCode(HttpStatus.CREATED)
  async uploadInternal(@Body() body: CreateInternalFileBody): Promise<{ fileId: string }> {
    const file = await this.filesService.createInternalFile(body);
    return { fileId: file.id };
  }

  /**
   * Stream 22 — internal download endpoint used by claw-workspace-service's
   * attachment download proxy. Service-token guarded.
   */
  @Public()
  @UseGuards(ServiceTokenGuard)
  @Get('download-internal/:id')
  async downloadInternal(@Param('id') id: string, @Res() res: Response): Promise<void> {
    return this.filesService.downloadFilePublic(id, res);
  }

  /**
   * Copies a file into a permanent, share-owned duplicate.
   *
   * chat-service calls this when a conversation carrying images is published.
   * It receives an id, never bytes — the copy happens inside the service that
   * owns storage. Returns 204 with no body when the source is missing, not an
   * image, or too large: one skipped picture is a better outcome than a refused
   * publish. See docs/13-adr/adr-075-public-share-assets.md.
   */
  @Public()
  @UseGuards(ServiceTokenGuard)
  @Post('publish-copy')
  @HttpCode(HttpStatus.OK)
  async publishCopy(
    @Body(new ZodValidationPipe(publishCopySchema)) body: PublishCopyDto,
  ): Promise<PublishedCopyResult | null> {
    return this.filesService.createPublishedCopy(body.sourceFileId);
  }

  /**
   * Deletes a share-owned copy.
   *
   * This is how revocation reaches the bytes: the copy has no retention expiry,
   * so nothing else will ever reap it.
   */
  @Public()
  @UseGuards(ServiceTokenGuard)
  @Delete('published-copy/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deletePublishedCopy(@Param('id') id: string): Promise<void> {
    return this.filesService.deletePublishedCopy(id);
  }

  @Public()
  @UseGuards(ServiceTokenGuard)
  @Get('metadata-internal/:id')
  async metadataInternal(@Param('id') id: string): Promise<File | null> {
    return this.filesRepository.findById(id);
  }
}
