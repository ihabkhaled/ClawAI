import { Body, Controller, Headers, Post } from '@nestjs/common';
import { Public } from '../../../app/decorators/public.decorator';
import { ZodValidationPipe } from '../../../app/pipes/zod-validation.pipe';
import { FeedbackService } from '../services/feedback.service';
import {
  type CreatePublicFeedbackDto,
  createPublicFeedbackSchema,
} from '../dto/create-public-feedback.dto';
import { type CreatePublicFeedbackResult } from '../types/feedback.types';
import { resolveClientIp } from '../utilities/client-ip.utility';

// No JWT guard and no permission: this is the marketing-page door. Safety comes
// from the honeypot, the per-address and per-email limits in the manager, the
// body cap and nginx limit_req - see ADR-141.
@Controller('feedback/public')
@Public()
export class FeedbackPublicController {
  constructor(private readonly feedbackService: FeedbackService) {}

  @Post()
  create(
    @Headers() headers: Record<string, string | string[] | undefined>,
    @Body(new ZodValidationPipe(createPublicFeedbackSchema)) dto: CreatePublicFeedbackDto,
  ): Promise<CreatePublicFeedbackResult> {
    return this.feedbackService.createPublicTicket(resolveClientIp(headers), dto);
  }
}
