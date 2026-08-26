import { Body, Controller, Get, Param, Patch, Query, Res } from '@nestjs/common';
import { Permission } from '@claw/shared-types';
import { RequirePermissions } from '@claw/shared-entitlements';
import { ZodValidationPipe } from '../../../app/pipes/zod-validation.pipe';
import { CurrentUser } from '../../../app/decorators/current-user.decorator';
import { type AuthenticatedUser } from '../../../common/types';
import { type Response } from 'express';
import { FeedbackService } from '../services/feedback.service';
import { type ListFeedbackQueryDto, listFeedbackQuerySchema } from '../dto/list-feedback-query.dto';
import {
  type UpdateFeedbackStatusDto,
  updateFeedbackStatusSchema,
} from '../dto/update-feedback-status.dto';
import { type FeedbackTicketDocument } from '../schemas/feedback-ticket.schema';
import { type FeedbackPaginatedTickets } from '../types/feedback.types';

@Controller('feedback/admin')
@RequirePermissions(Permission.ADMIN_FEEDBACK_MANAGE)
export class FeedbackAdminController {
  constructor(private readonly feedbackService: FeedbackService) {}

  @Get('stats')
  stats(): Promise<Record<string, number>> {
    return this.feedbackService.statusCounts();
  }

  @Get()
  list(
    @Query(new ZodValidationPipe(listFeedbackQuerySchema)) query: ListFeedbackQueryDto,
  ): Promise<FeedbackPaginatedTickets<FeedbackTicketDocument>> {
    return this.feedbackService.listForAdmin(query);
  }

  @Get(':id')
  detail(@Param('id') id: string): Promise<FeedbackTicketDocument> {
    return this.feedbackService.getForAdmin(id);
  }

  @Patch(':id/status')
  changeStatus(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateFeedbackStatusSchema)) dto: UpdateFeedbackStatusDto,
  ): Promise<void> {
    return this.feedbackService.changeStatus(user.id, user.email, id, dto);
  }

  @Get(':id/attachments/:fileId')
  attachment(
    @Param('id') id: string,
    @Param('fileId') fileId: string,
    @Res() res: Response,
  ): Promise<void> {
    return this.feedbackService.streamAttachment(id, fileId, res);
  }
}
