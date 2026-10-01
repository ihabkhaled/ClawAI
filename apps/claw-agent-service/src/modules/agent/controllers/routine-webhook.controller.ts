import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
  type RawBodyRequest,
  Req,
} from '@nestjs/common';
import { CurrentUser, Public } from '@claw/shared-auth';
import type { Request } from 'express';
import { ZodValidationPipe } from '../../../app/pipes/zod-validation.pipe';
import {
  CHANNEL_SIGNATURE_HEADER,
  CHANNEL_TIMESTAMP_HEADER,
} from '../../channels/constants/channel.constants';
import { type SetRoutineWebhookDto, setRoutineWebhookSchema } from '../dto/routine-webhook.dto';
import { RoutineWebhookService } from '../services/routine-webhook.service';
import type { RoutineWebhookInfo, RoutineWebhookResult } from '../types/routine-webhook.types';
import type { AuthenticatedUser } from '../../../common/types/auth.types';

/**
 * F099: the webhook that fires a prompt routine. The owner endpoints use the
 * user JWT and answer 404 for a routine that is not theirs. The receiving
 * route is `@Public()` because a CI runner has no user JWT: authenticity is the
 * HMAC over the raw bytes plus a timestamp window, checked in the service,
 * which is why it reads `req.rawBody`. Throttling stays on.
 */
@Controller('agent')
export class RoutineWebhookController {
  constructor(private readonly webhooks: RoutineWebhookService) {}

  @Get('scheduled-commands/:id/webhook')
  async info(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ): Promise<RoutineWebhookInfo> {
    return this.webhooks.info(user.id, id);
  }

  @Put('scheduled-commands/:id/webhook')
  async setEnabled(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(setRoutineWebhookSchema)) dto: SetRoutineWebhookDto,
  ): Promise<RoutineWebhookInfo> {
    return this.webhooks.setEnabled(user.id, id, dto.enabled);
  }

  /** Shown again on every read; the previous secret stops verifying when this returns. */
  @Post('scheduled-commands/:id/webhook/rotate')
  @HttpCode(HttpStatus.OK)
  async rotate(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ): Promise<RoutineWebhookInfo> {
    return this.webhooks.rotate(user.id, id);
  }

  @Post('routines/webhook/:routineId')
  @Public()
  @HttpCode(HttpStatus.ACCEPTED)
  async receive(
    @Param('routineId') routineId: string,
    @Req() request: RawBodyRequest<Request>,
    @Headers(CHANNEL_SIGNATURE_HEADER) signature: string | undefined,
    @Headers(CHANNEL_TIMESTAMP_HEADER) timestamp: string | undefined,
  ): Promise<RoutineWebhookResult> {
    return this.webhooks.receive(
      routineId,
      { signature, timestamp },
      request.rawBody?.toString('utf8') ?? '',
    );
  }
}
