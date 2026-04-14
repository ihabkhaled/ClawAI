import { Body, Controller, Post, UsePipes } from '@nestjs/common';

import { CurrentUser } from '@claw/shared-auth';
import { ZodValidationPipe } from '../../../app/pipes/zod-validation.pipe';
import { WorkspaceSearchService } from '../services/workspace-search.service';
import {
  type WorkspaceSearchQueryDto,
  workspaceSearchQuerySchema,
} from '../dto/workspace-search-query.dto';
import type { WorkspaceSearchResponse } from '../types/workspace.types';
import type { AuthenticatedUser } from '../../../common/types/auth.types';

@Controller('workspace/search')
export class WorkspaceSearchController {
  constructor(private readonly service: WorkspaceSearchService) {}

  @Post()
  @UsePipes(new ZodValidationPipe(workspaceSearchQuerySchema))
  search(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: WorkspaceSearchQueryDto,
  ): Promise<WorkspaceSearchResponse> {
    return this.service.search(user.id, dto);
  }
}
