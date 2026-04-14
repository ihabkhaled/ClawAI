import { Body, Controller, Post, UsePipes } from '@nestjs/common';

import { Public } from '@claw/shared-auth';
import { ZodValidationPipe } from '../../../app/pipes/zod-validation.pipe';
import { WorkspaceSearchService } from '../services/workspace-search.service';
import {
  type WorkspaceInternalSearchQueryDto,
  workspaceInternalSearchQuerySchema,
} from '../dto/workspace-internal-search-query.dto';
import type { WorkspaceSearchResponse } from '../types/workspace.types';

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
