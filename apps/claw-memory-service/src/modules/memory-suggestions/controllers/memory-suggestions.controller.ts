import { Body, Controller, Delete, Get, Param, Post, Query } from '@nestjs/common';
import { Permission } from '@claw/shared-types';
import { RequirePermissions } from '@claw/shared-entitlements';
import type { MemoryRecord, MemorySuggestion } from '../../../generated/prisma';
import { ZodValidationPipe } from '../../../app/pipes/zod-validation.pipe';
import { CurrentUser } from '../../../app/decorators/current-user.decorator';
import type { AuthenticatedUser, PaginatedResult } from '../../../common/types';
import { MemorySuggestionService } from '../services/memory-suggestion.service';
import { type ApproveSuggestionDto, approveSuggestionSchema } from '../dto/approve-suggestion.dto';
import {
  type BulkApproveSuggestionsDto,
  bulkApproveSuggestionsSchema,
} from '../dto/bulk-approve-suggestions.dto';
import {
  type ListMemorySuggestionsQueryDto,
  listMemorySuggestionsQuerySchema,
} from '../dto/list-memory-suggestions-query.dto';
import { type RejectSuggestionDto, rejectSuggestionSchema } from '../dto/reject-suggestion.dto';

@Controller('memory-suggestions')
@RequirePermissions(Permission.MEMORY_USE)
export class MemorySuggestionsController {
  constructor(private readonly service: MemorySuggestionService) {}

  @Get()
  async list(
    @CurrentUser() user: AuthenticatedUser,
    @Query(new ZodValidationPipe(listMemorySuggestionsQuerySchema))
    query: ListMemorySuggestionsQueryDto,
  ): Promise<PaginatedResult<MemorySuggestion>> {
    return this.service.list(user.id, query);
  }

  @Post(':id/approve')
  async approve(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(approveSuggestionSchema)) dto: ApproveSuggestionDto,
  ): Promise<MemoryRecord> {
    return this.service.approve(id, user.id, dto);
  }

  @Post(':id/reject')
  async reject(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(rejectSuggestionSchema)) dto: RejectSuggestionDto,
  ): Promise<MemorySuggestion> {
    return this.service.reject(id, user.id, dto);
  }

  @Delete(':id')
  async dismiss(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<MemorySuggestion> {
    return this.service.dismiss(id, user.id);
  }

  @Post('bulk-approve')
  async bulkApprove(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(bulkApproveSuggestionsSchema)) dto: BulkApproveSuggestionsDto,
  ): Promise<{ approved: string[]; skipped: Array<{ suggestionId: string; reason: string }> }> {
    return this.service.bulkApprove(dto.suggestionIds, user.id);
  }
}
