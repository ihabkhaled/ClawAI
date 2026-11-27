import { Body, Controller, Post, UseGuards, UsePipes } from '@nestjs/common';

import { Public } from '@claw/shared-auth';
import { ServiceTokenGuard } from '../../../app/guards/service-token.guard';
import { ZodValidationPipe } from '../../../app/pipes/zod-validation.pipe';
import { WorkspaceSearchService } from '../services/workspace-search.service';
import {
  type WorkspaceInternalSearchQueryDto,
  workspaceInternalSearchQuerySchema,
} from '../dto/workspace-internal-search-query.dto';
import type { WorkspaceSearchResponse } from '../types/workspace.types';

/**
 * Service-to-service only (chat-service's workspace context). `@Public()` lifts the user JWT; the
 * class-level ServiceTokenGuard is the real check (security audit 2026-11-27: the body carries a
 * userId and the route had no guard).
 */
@UseGuards(ServiceTokenGuard)
@Controller('internal/workspace/search')
export class WorkspaceSearchInternalController {
  constructor(private readonly service: WorkspaceSearchService) {}

  @Public()
  @Post()
  @UsePipes(new ZodValidationPipe(workspaceInternalSearchQuerySchema))
  searchInternal(@Body() dto: WorkspaceInternalSearchQueryDto): Promise<WorkspaceSearchResponse> {
    return this.service.searchInternal(dto);
  }
}
