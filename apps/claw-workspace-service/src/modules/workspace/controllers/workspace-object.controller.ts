import { Controller, Get, Param, Query } from '@nestjs/common';
import { CurrentUser } from '@claw/shared-auth';
import { ZodValidationPipe } from '../../../app/pipes/zod-validation.pipe';
import { WorkspaceObjectService } from '../services/workspace-object.service';
import {
  type ListWorkspaceObjectsQueryDto,
  listWorkspaceObjectsQuerySchema,
} from '../dto/list-workspace-objects-query.dto';
import type { PaginatedWorkspaceObjects, WorkspaceObjectWithLinks } from '../types/workspace.types';
import type { AuthenticatedUser } from '../../../common/types/auth.types';

@Controller('workspace/objects')
export class WorkspaceObjectController {
  constructor(private readonly service: WorkspaceObjectService) {}

  @Get()
  listObjects(
    @CurrentUser() user: AuthenticatedUser,
    @Query(new ZodValidationPipe(listWorkspaceObjectsQuerySchema))
    query: ListWorkspaceObjectsQueryDto,
  ): Promise<PaginatedWorkspaceObjects> {
    return this.service.listObjects(user.id, query);
  }

  @Get(':id')
  getObject(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ): Promise<WorkspaceObjectWithLinks> {
    return this.service.getObject(id, user.id);
  }
}
