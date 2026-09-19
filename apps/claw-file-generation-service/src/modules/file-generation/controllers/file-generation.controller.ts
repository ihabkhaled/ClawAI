import {
  Body,
  Controller,
  Get,
  MessageEvent,
  Param,
  Post,
  Query,
  Res,
  Sse,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { type Observable } from 'rxjs';
import { CurrentUser } from '../../../app/decorators/current-user.decorator';
import { type AuthenticatedUser } from '../../../common/types';
import { ZodValidationPipe } from '../../../app/pipes/zod-validation.pipe';
import { FileGenerationService } from '../services/file-generation.service';
import { FileGenerationEventsService } from '../services/file-generation-events.service';
import { FileGenerationOwnerGuard } from '../guards/file-generation-owner.guard';
import { contentDisposition } from '../utilities/file-asset.utility';
import {
  type ExportFileDto,
  exportFileSchema,
  type ListFileGenerationsQueryDto,
  listFileGenerationsQuerySchema,
} from '../dto/generate-file.dto';

@Controller('file-generations')
export class FileGenerationController {
  constructor(
    private readonly fileGenService: FileGenerationService,
    private readonly eventsService: FileGenerationEventsService,
  ) {}

  @Get()
  async list(
    @CurrentUser() user: AuthenticatedUser,
    @Query(new ZodValidationPipe(listFileGenerationsQuerySchema))
    query: ListFileGenerationsQueryDto,
  ): Promise<unknown> {
    return this.fileGenService.listByUser(user.id, query);
  }

  /** Export text the user already has (an AI answer) as a file. No model call. */
  @Post('export')
  async export(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(exportFileSchema)) dto: ExportFileDto,
  ): Promise<{ generationId: string; status: string }> {
    const record = await this.fileGenService.exportForUser(user.id, dto);
    return { generationId: record.id, status: record.status };
  }

  @Get(':id')
  async getById(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser): Promise<unknown> {
    return this.fileGenService.getViewForUser(id, user.id);
  }

  // Owner only: retry used to accept any id, so user A could re-run user B's job.
  @Post(':id/retry')
  async retry(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<{ generationId: string; status: string }> {
    const record = await this.fileGenService.retryGenerationForUser(id, user.id);
    return { generationId: record.id, status: record.status };
  }

  // Owner only: this stream was public, so anyone holding an id could watch
  // the job's status and asset links. The guard refuses before a stream opens.
  @UseGuards(FileGenerationOwnerGuard)
  @Sse(':id/events')
  events(@Param('id') id: string): Observable<MessageEvent> {
    return this.eventsService.subscribe(id);
  }

  /**
   * The owner's file. Streamed through this service, so the URL carries no
   * storage id or path; `private, no-store` keeps it out of shared caches.
   */
  @UseGuards(FileGenerationOwnerGuard)
  @Get(':id/assets/:assetId/download')
  async download(
    @Param('id') id: string,
    @Param('assetId') assetId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Res() res: Response,
  ): Promise<void> {
    const file = await this.fileGenService.openAssetForUser(id, assetId, user.id);
    res.setHeader('Content-Type', file.mimeType);
    res.setHeader('Content-Disposition', contentDisposition(file.filename, file.unicodeFilename));
    res.setHeader('Cache-Control', 'private, no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    file.stream.pipe(res);
  }

  /** Rebuild the file from its saved text: free and identical. Owner only. */
  @UseGuards(FileGenerationOwnerGuard)
  @Post(':id/rebuild')
  async rebuild(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<{ generationId: string; status: string }> {
    const record = await this.fileGenService.rebuildForUser(id, user.id);
    return { generationId: record.id, status: record.status };
  }
}
