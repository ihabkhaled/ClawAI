import { Body, Controller, Get, HttpCode, HttpStatus, Param, Patch, Post, Query } from '@nestjs/common';
import { CurrentUser } from '@claw/shared-auth';

import { ZodValidationPipe } from '../../../app/pipes/zod-validation.pipe';
import { WorkspaceObjectType } from '../../../common/enums/workspace-object-type.enum';
import { WorkspaceProvider } from '../../../common/enums/workspace-provider.enum';
import {
  type InboxQueryDto,
  inboxQuerySchema,
  type NeedsAttentionDto,
  needsAttentionSchema,
  type SearchBodyDto,
  searchBodySchema,
} from '../dto/inbox.dto';
import { InboxService } from '../services/inbox.service';
import { WorkspaceSemanticSearchService } from '../services/workspace-semantic-search.service';
import type { AuthenticatedUser } from '../../../common/types/auth.types';
import type { InboxPage, SearchResponse } from '../types/inbox.types';

@Controller('workspace/inbox')
export class InboxController {
  constructor(
    private readonly inboxService: InboxService,
    private readonly searchService: WorkspaceSemanticSearchService,
  ) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  async list(
    @CurrentUser() user: AuthenticatedUser,
    @Query(new ZodValidationPipe(inboxQuerySchema)) query: InboxQueryDto,
  ): Promise<InboxPage> {
    return this.inboxService.list({
      userId: user.id,
      providers: this.parseList(query.providers, WorkspaceProvider),
      types: this.parseList(query.types, WorkspaceObjectType),
      needsAttention: query.needsAttention === 'true',
      hasSuggestion: query.hasSuggestion === 'true',
      dateFrom: this.parseDate(query.dateFrom),
      dateTo: this.parseDate(query.dateTo),
      cursor: query.cursor,
      limit: query.limit,
    });
  }

  @Post('search')
  @HttpCode(HttpStatus.OK)
  async search(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(searchBodySchema)) body: SearchBodyDto,
  ): Promise<SearchResponse> {
    return this.searchService.search({
      userId: user.id,
      query: body.query,
      topK: body.topK,
      providers: body.providers,
    });
  }

  @Patch('objects/:id/needs-attention')
  @HttpCode(HttpStatus.OK)
  async setNeedsAttention(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') objectId: string,
    @Body(new ZodValidationPipe(needsAttentionSchema)) dto: NeedsAttentionDto,
  ): Promise<{ updated: boolean }> {
    return this.inboxService.setNeedsAttention(user.id, objectId, dto.needsAttention);
  }

  private parseList<T extends Record<string, string>>(
    raw: string | undefined,
    enumObject: T,
  ): Array<T[keyof T]> | undefined {
    if (raw === undefined || raw.length === 0) return undefined;
    const valid = Object.values(enumObject) as string[];
    const out = raw
      .split(',')
      .map((s) => s.trim())
      .filter((s) => valid.includes(s)) as Array<T[keyof T]>;
    return out.length > 0 ? out : undefined;
  }

  private parseDate(raw: string | undefined): Date | undefined {
    if (raw === undefined) return undefined;
    const date = new Date(raw);
    return Number.isNaN(date.getTime()) ? undefined : date;
  }
}
