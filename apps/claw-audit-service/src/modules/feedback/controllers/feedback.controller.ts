import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { Permission } from '@claw/shared-types';
import { RequirePermissions } from '@claw/shared-entitlements';
import { ZodValidationPipe } from '../../../app/pipes/zod-validation.pipe';
import { CurrentUser } from '../../../app/decorators/current-user.decorator';
import { type AuthenticatedUser } from '../../../common/types';
import { FeedbackService } from '../services/feedback.service';
import { type CreateFeedbackDto, createFeedbackSchema } from '../dto/create-feedback.dto';
import { type ListFeedbackQueryDto, listFeedbackQuerySchema } from '../dto/list-feedback-query.dto';
import { type FeedbackTicketDocument } from '../schemas/feedback-ticket.schema';
import { type CreateFeedbackResult, type FeedbackPaginatedTickets } from '../types/feedback.types';

@Controller('feedback')
@RequirePermissions(Permission.FEEDBACK_SUBMIT)
export class FeedbackController {
  constructor(private readonly feedbackService: FeedbackService) {}

  @Post()
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(createFeedbackSchema)) dto: CreateFeedbackDto,
  ): Promise<CreateFeedbackResult> {
    return this.feedbackService.createTicket(user.id, user.email, dto);
  }

  @Get('mine')
  listMine(
    @CurrentUser() user: AuthenticatedUser,
    @Query(new ZodValidationPipe(listFeedbackQuerySchema)) query: ListFeedbackQueryDto,
  ): Promise<FeedbackPaginatedTickets<FeedbackTicketDocument>> {
    return this.feedbackService.listOwn(user.id, query);
  }

  @Get('mine/:id')
  getMine(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ): Promise<FeedbackTicketDocument> {
    return this.feedbackService.getOwn(user.id, id);
  }
}
