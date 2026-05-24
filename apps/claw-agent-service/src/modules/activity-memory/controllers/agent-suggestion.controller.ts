import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { CurrentUser } from '@claw/shared-auth';

import { ZodValidationPipe } from '../../../app/pipes/zod-validation.pipe';
import {
  type ListSuggestionsQueryDto,
  listSuggestionsQuerySchema,
  type ReviewSuggestionDto,
  reviewSuggestionSchema,
} from '../dto/suggestion.dto';
import { AgentSuggestionRepository } from '../repositories/agent-suggestion.repository';
import type { AgentSuggestion, AgentSuggestionStatus } from '../../../generated/prisma';
import type { AuthenticatedUser } from '../../../common/types/auth.types';

/**
 * V2 Stream 05 — endpoints under `/agent/suggestions`. 3-line methods.
 */
@Controller('agent/suggestions')
export class AgentSuggestionController {
  constructor(private readonly repo: AgentSuggestionRepository) {}

  @Get()
  async list(
    @CurrentUser() user: AuthenticatedUser,
    @Query(new ZodValidationPipe(listSuggestionsQuerySchema)) query: ListSuggestionsQueryDto,
  ): Promise<{ data: AgentSuggestion[]; total: number; page: number; pageSize: number }> {
    const result = await this.repo.listForUser(
      user.id,
      query.status as AgentSuggestionStatus | undefined,
      query.page,
      query.pageSize,
    );
    return { ...result, page: query.page, pageSize: query.pageSize };
  }

  @Post(':id/review')
  async review(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(reviewSuggestionSchema)) dto: ReviewSuggestionDto,
  ): Promise<AgentSuggestion> {
    return this.repo.setStatus(id, user.id, dto.status as AgentSuggestionStatus);
  }
}
