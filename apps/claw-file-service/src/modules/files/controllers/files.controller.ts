import { Body, Controller, Delete, Get, Param, Post, Query, Res } from '@nestjs/common';
import { type Response } from 'express';
import { Permission } from '@claw/shared-types';
import { RequirePermissions } from '@claw/shared-entitlements';
import { type File, type FileChunk } from '../../../generated/prisma';
import { ZodValidationPipe } from '../../../app/pipes/zod-validation.pipe';
import { CurrentUser } from '../../../app/decorators/current-user.decorator';
import { type AuthenticatedUser, type PaginatedResult } from '../../../common/types';
import { FilesService } from '../services/files.service';
import { type UploadFileDto, uploadFileSchema } from '../dto/upload-file.dto';
import { type ListFilesQueryDto, listFilesQuerySchema } from '../dto/list-files-query.dto';
import { type FileListRow } from '../types/archive-entries.types';
import { type ChunkedUploadStatus } from '../types/chunked-upload.types';
import {
  type ChunkIndexParamDto,
  chunkIndexParamSchema,
  type InitChunkedUploadDto,
  initChunkedUploadSchema,
  type UploadChunkDto,
  uploadChunkSchema,
  type UploadIdParamDto,
  uploadIdParamSchema,
} from '../dto/chunked-upload.dto';

// Slice C backend 3 — all user-facing file endpoints require FILES_USE.
// Internal service-to-service routes live in FilesInternalController and stay
// guarded by ServiceTokenGuard (no plan/permission gate there).
@Controller('files')
@RequirePermissions(Permission.FILES_USE)
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  @Post('upload')
  async upload(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(uploadFileSchema)) dto: UploadFileDto,
  ): Promise<File> {
    return this.filesService.uploadFile(user.id, dto);
  }

  // Chunked upload — for files above the composer's single-shot threshold
  // (recordings, mainly). See ChunkedUploadManager for the on-disk session
  // format and rules/48's "no infinite retry" for why the client, not this
  // endpoint, owns the retry/backoff loop.
  @Post('upload/chunked/init')
  initChunkedUpload(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(initChunkedUploadSchema)) dto: InitChunkedUploadDto,
  ): ChunkedUploadStatus {
    return this.filesService.initChunkedUpload(user.id, dto);
  }

  @Post('upload/chunked/:uploadId/chunks/:index')
  uploadChunk(
    @CurrentUser() user: AuthenticatedUser,
    @Param(new ZodValidationPipe(chunkIndexParamSchema)) params: ChunkIndexParamDto,
    @Body(new ZodValidationPipe(uploadChunkSchema)) dto: UploadChunkDto,
  ): ChunkedUploadStatus {
    return this.filesService.uploadChunk(user.id, params.uploadId, params.index, dto.content);
  }

  @Get('upload/chunked/:uploadId/status')
  getChunkedUploadStatus(
    @CurrentUser() user: AuthenticatedUser,
    @Param(new ZodValidationPipe(uploadIdParamSchema)) params: UploadIdParamDto,
  ): ChunkedUploadStatus {
    return this.filesService.getChunkedUploadStatus(user.id, params.uploadId);
  }

  @Post('upload/chunked/:uploadId/complete')
  async completeChunkedUpload(
    @CurrentUser() user: AuthenticatedUser,
    @Param(new ZodValidationPipe(uploadIdParamSchema)) params: UploadIdParamDto,
  ): Promise<File> {
    return this.filesService.completeChunkedUpload(user.id, params.uploadId);
  }

  @Get()
  async findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query(new ZodValidationPipe(listFilesQuerySchema)) query: ListFilesQueryDto,
  ): Promise<PaginatedResult<FileListRow>> {
    return this.filesService.getFiles(user.id, query);
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser): Promise<File> {
    return this.filesService.getFile(id, user.id);
  }

  @Delete(':id')
  async remove(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser): Promise<File> {
    return this.filesService.deleteFile(id, user.id);
  }

  @Get('download/:id')
  async download(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Res() res: Response,
  ): Promise<void> {
    return this.filesService.downloadFile(id, user.id, res);
  }

  @Get(':id/chunks')
  async getChunks(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<FileChunk[]> {
    return this.filesService.getChunks(id, user.id);
  }
}
