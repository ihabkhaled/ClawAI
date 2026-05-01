import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { CurrentUser } from '@claw/shared-auth';

import { ZodValidationPipe } from '../../../app/pipes/zod-validation.pipe';
import {
  type BulkApproveQueueDto,
  bulkApproveQueueSchema,
  type EditAndApproveQueueDto,
  editAndApproveQueueSchema,
  type QueueListQueryDto,
  queueListQuerySchema,
  type RejectQueueDto,
  rejectQueueSchema,
} from '../dto/ai-action-queue.dto';
import { AiActionApprovalQueueService } from '../services/ai-action-approval-queue.service';
import type { BulkApproveResult } from '../types/ai-action-policy.types';
import type { AuthenticatedUser } from '../../../common/types/auth.types';
import type { AiActionApprovalQueue } from '../../../generated/prisma';

@Controller('workspace/ai-actions/queue')
export class AiActionApprovalQueueController {
  constructor(private readonly service: AiActionApprovalQueueService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  async list(
    @CurrentUser() user: AuthenticatedUser,
    @Query(new ZodValidationPipe(queueListQuerySchema)) query: QueueListQueryDto,
  ): Promise<AiActionApprovalQueue[]> {
    return this.service.list(user.id, query);
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  async getOne(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ): Promise<AiActionApprovalQueue> {
    return this.service.getById(id, user.id);
  }

  @Post(':id/approve')
  @HttpCode(HttpStatus.OK)
  async approve(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ): Promise<AiActionApprovalQueue> {
    return this.service.approve({ queueId: id, userId: user.id });
  }

  @Post(':id/reject')
  @HttpCode(HttpStatus.OK)
  async reject(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(rejectQueueSchema)) dto: RejectQueueDto,
  ): Promise<AiActionApprovalQueue> {
    return this.service.reject({ queueId: id, userId: user.id, reason: dto.reason });
  }

  @Post(':id/edit-and-approve')
  @HttpCode(HttpStatus.OK)
  async editAndApprove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(editAndApproveQueueSchema)) dto: EditAndApproveQueueDto,
  ): Promise<AiActionApprovalQueue> {
    return this.service.editAndApprove({
      queueId: id,
      userId: user.id,
      editedPayload: dto.editedPayload,
    });
  }

  @Post('bulk-approve')
  @HttpCode(HttpStatus.OK)
  async bulkApprove(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(bulkApproveQueueSchema)) dto: BulkApproveQueueDto,
  ): Promise<BulkApproveResult> {
    return this.service.bulkApprove({ userId: user.id, queueIds: dto.queueIds });
  }
}
