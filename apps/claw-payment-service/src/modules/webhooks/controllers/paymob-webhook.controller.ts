import {
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  type RawBodyRequest,
  Req,
} from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { Public } from '@claw/shared-auth';
import type { Request } from 'express';

import { WEBHOOK_ACK_BODY } from '../constants/webhook.constants';
import { PaymobWebhookService } from '../services/paymob-webhook.service';
import { type WebhookAck } from '../types/webhook-ack.types';

/**
 * Paymob's transaction callback.
 *
 * Paymob sends its HMAC as a query parameter rather than a header, so it is
 * read from `?hmac=`. Everything else matches the PayPal endpoint: public
 * because a gateway holds no JWT, always 200 so a forger learns nothing, and
 * verification over the raw bytes inside the service.
 */
@Controller('payments/webhooks/paymob')
@Public()
@SkipThrottle()
export class PaymobWebhookController {
  constructor(private readonly webhooks: PaymobWebhookService) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  async receive(
    @Req() request: RawBodyRequest<Request>,
    @Query('hmac') hmac: string,
  ): Promise<WebhookAck> {
    await this.webhooks.handle(request.rawBody?.toString('utf8') ?? '', hmac ?? '');
    return WEBHOOK_ACK_BODY;
  }
}
