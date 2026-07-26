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
import { PaymobCardTokenService } from '../services/paymob-card-token.service';
import { PaymobWebhookService } from '../services/paymob-webhook.service';
import { type WebhookAck } from '../types/webhook-ack.types';

/**
 * Paymob's transaction and card-token callbacks.
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
  constructor(
    private readonly webhooks: PaymobWebhookService,
    private readonly cardTokens: PaymobCardTokenService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  async receive(
    @Req() request: RawBodyRequest<Request>,
    @Query('hmac') hmac: string,
  ): Promise<WebhookAck> {
    await this.webhooks.handle(request.rawBody?.toString('utf8') ?? '', hmac ?? '');
    return WEBHOOK_ACK_BODY;
  }

  // Named alias for the same handler. The bare route above is kept because it is
  // already configured in live Paymob dashboards — changing a webhook URL that a
  // gateway is actively posting to is an outage, not a rename.
  @Post('transaction')
  @HttpCode(HttpStatus.OK)
  async receiveTransaction(
    @Req() request: RawBodyRequest<Request>,
    @Query('hmac') hmac: string,
  ): Promise<WebhookAck> {
    await this.webhooks.handle(request.rawBody?.toString('utf8') ?? '', hmac ?? '');
    return WEBHOOK_ACK_BODY;
  }

  // Fired when a customer ticks "save this card". Separate endpoint because the
  // payload is a different shape and creates a reusable credential rather than
  // settling money — conflating them would mean one handler deciding which of two
  // very different things a body is.
  @Post('card-token')
  @HttpCode(HttpStatus.OK)
  async receiveCardToken(
    @Req() request: RawBodyRequest<Request>,
    @Query('hmac') hmac: string,
  ): Promise<WebhookAck> {
    await this.cardTokens.handle(request.rawBody?.toString('utf8') ?? '', hmac ?? '');
    return WEBHOOK_ACK_BODY;
  }
}
