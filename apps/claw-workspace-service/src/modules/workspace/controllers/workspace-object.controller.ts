import { Controller, Get, HttpCode, HttpStatus, Param, Post, Query, Res } from '@nestjs/common';
import { CurrentUser } from '@claw/shared-auth';
import type { Response } from 'express';
import { ZodValidationPipe } from '../../../app/pipes/zod-validation.pipe';
import { WorkspaceObjectService } from '../services/workspace-object.service';
import { streamFileContentToResponse } from '../utilities/file-content-stream.utility';
import {
  type ListWorkspaceObjectsQueryDto,
  listWorkspaceObjectsQuerySchema,
} from '../dto/list-workspace-objects-query.dto';
import type { PaginatedWorkspaceObjects, WorkspaceObjectWithLinks } from '../types/workspace.types';
import type { AuthenticatedUser } from '../../../common/types/auth.types';
import type { WorkspaceObject } from '../../../generated/prisma';

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

  @Post(':id/refresh')
  @HttpCode(HttpStatus.OK)
  refreshObject(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ): Promise<WorkspaceObject> {
    return this.service.refreshObject(id, user.id);
  }

  // v3 round 11 (Prompt 08) — stream a file-backed object's raw bytes.
  // @Res() is required for streaming; the service does all the auth +
  // provider work and the stream utility pipes the body to the response.
  @Get(':id/content')
  async downloadObjectContent(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Res() res: Response,
  ): Promise<void> {
    const stream = await this.service.downloadObjectContent(id, user.id);
    await streamFileContentToResponse(stream, res);
  }
}
