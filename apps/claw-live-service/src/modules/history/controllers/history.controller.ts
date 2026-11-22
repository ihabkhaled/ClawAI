import { Body, Controller, Get, Param, Post, Query, Res, StreamableFile } from '@nestjs/common';
import { contentDispositionHeader, ContentDispositionType } from '@claw/shared-utilities';
import type { Response } from 'express';
import { CurrentUser } from '@claw/shared-auth';
import { type AuthenticatedUser } from '@claw/shared-types';

import { ZodValidationPipe } from '../../../app/pipes/zod-validation.pipe';
import {
  type ExportBody,
  exportBodySchema,
  type HistoryEventsQuery,
  historyEventsQuerySchema,
  historyIdParamSchema,
  type HistoryListQuery,
  historyListQuerySchema,
} from '../dto/history.dto';
import { HistoryExportService } from '../services/history-export.service';
import { HistoryService } from '../services/history.service';
import type {
  HistoryEventView,
  HistoryPage,
  HistorySessionView,
  HistoryVersionView,
} from '../types/history.types';

@Controller('live')
export class HistoryController {
  constructor(
    private readonly history: HistoryService,
    private readonly exporter: HistoryExportService,
  ) {}

  @Get('history')
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Query(new ZodValidationPipe(historyListQuerySchema)) query: HistoryListQuery,
  ): Promise<HistoryPage<HistorySessionView>> {
    return this.history.listSessions(user.id, query);
  }

  @Get('history/:sessionId/events')
  events(
    @CurrentUser() user: AuthenticatedUser,
    @Param('sessionId', new ZodValidationPipe(historyIdParamSchema)) sessionId: string,
    @Query(new ZodValidationPipe(historyEventsQuerySchema)) query: HistoryEventsQuery,
  ): Promise<HistoryPage<HistoryEventView>> {
    return this.history.listEvents(user.id, sessionId, query);
  }

  @Get('events/:eventId/versions')
  versions(
    @CurrentUser() user: AuthenticatedUser,
    @Param('eventId', new ZodValidationPipe(historyIdParamSchema)) eventId: string,
  ): Promise<HistoryVersionView[]> {
    return this.history.listVersions(user.id, eventId);
  }

  @Post('history/:sessionId/export')
  async export(
    @CurrentUser() user: AuthenticatedUser,
    @Param('sessionId', new ZodValidationPipe(historyIdParamSchema)) sessionId: string,
    @Body(new ZodValidationPipe(exportBodySchema)) body: ExportBody,
    @Res({ passthrough: true }) response: Response,
  ): Promise<StreamableFile> {
    const file = await this.exporter.export(user.id, sessionId, body.format);
    response.setHeader('Content-Type', file.mimeType);
    response.setHeader(
      'Content-Disposition',
      contentDispositionHeader(ContentDispositionType.ATTACHMENT, file.fileName),
    );
    response.setHeader('Cache-Control', 'private, no-store');
    return new StreamableFile(file.body);
  }
}
