import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { CurrentUser } from '@claw/shared-auth';
import { ZodValidationPipe } from '../../../app/pipes/zod-validation.pipe';
import { WorkspaceActionService } from '../services/workspace-action.service';
import { type CreateActionDraftDto, createActionDraftSchema } from '../dto/create-action-draft.dto';
import { type ListActionsQueryDto, listActionsQuerySchema } from '../dto/list-actions.dto';
import { type RejectActionDto, rejectActionSchema } from '../dto/reject-action.dto';
import { type EditActionDto, editActionSchema } from '../dto/edit-action.dto';
import { type BulkApproveDto, bulkApproveSchema } from '../dto/bulk-approve.dto';
import type {
  BulkApproveOutcome,
  PaginatedWorkspaceActions,
  WorkspaceActionWithConnector,
} from '../types/action.types';
import type { AuthenticatedUser } from '../../../common/types/auth.types';

@Controller('workspace/actions')
export class WorkspaceActionController {
  constructor(private readonly service: WorkspaceActionService) {}

  @Post()
  async createDraft(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(createActionDraftSchema)) dto: CreateActionDraftDto,
  ): Promise<WorkspaceActionWithConnector> {
    return this.service.createDraft(user.id, dto);
  }

  @Get()
  async listActions(
    @CurrentUser() user: AuthenticatedUser,
    @Query(new ZodValidationPipe(listActionsQuerySchema)) query: ListActionsQueryDto,
  ): Promise<PaginatedWorkspaceActions> {
    return this.service.listActions(user.id, query);
  }

  @Post('bulk-approve')
  @HttpCode(HttpStatus.OK)
  async bulkApprove(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(bulkApproveSchema)) dto: BulkApproveDto,
  ): Promise<BulkApproveOutcome> {
    return this.service.bulkApprove(user.id, dto);
  }

  @Get(':id')
  async getAction(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ): Promise<WorkspaceActionWithConnector> {
    return this.service.getAction(id, user.id);
  }

  @Patch(':id')
  async editDraft(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(editActionSchema)) dto: EditActionDto,
  ): Promise<WorkspaceActionWithConnector> {
    return this.service.editDraft(id, user.id, dto);
  }

  @Post(':id/approve')
  @HttpCode(HttpStatus.OK)
  async approve(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ): Promise<WorkspaceActionWithConnector> {
    return this.service.approve(id, user.id);
  }

  @Post(':id/reject')
  @HttpCode(HttpStatus.OK)
  async reject(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(rejectActionSchema)) dto: RejectActionDto,
  ): Promise<WorkspaceActionWithConnector> {
    return this.service.reject(id, user.id, dto);
  }
}
