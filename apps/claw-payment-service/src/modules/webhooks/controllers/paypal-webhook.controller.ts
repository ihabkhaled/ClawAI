import {
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Post,
  type RawBodyRequest,
  Req,
} from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { Public } from '@claw/shared-auth';
import type { Request } from 'express';

import { WEBHOOK_ACK_BODY } from '../constants/webhook.constants';
import { PaypalWebhookService } from '../services/paypal-webhook.service';
import { type WebhookAck } from '../types/webhook-ack.types';

/**
 * PayPal's webhook endpoint.
 *
 * `@Public()` because a payment gateway cannot present a user JWT. Authenticity
 * comes from mandatory signature verification inside the service, over the raw
 * bytes — which is why this reads `req.rawBody` rather than a parsed body.
 *
 * It always answers 200. A 4xx would make PayPal retry, and telling a forger
 * that their signature was rejected only tells them to try another one. The
 * rejection is recorded server-side where an operator can see it.
 */
@Controller('payments/webhooks/paypal')
@Public()
@SkipThrottle()
export class PaypalWebhookController {
  constructor(private readonly webhooks: PaypalWebhookService) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  async receive(
    @Req() request: RawBodyRequest<Request>,
    @Headers('paypal-transmission-id') transmissionId: string,
    @Headers('paypal-transmission-time') transmissionTime: string,
    @Headers('paypal-transmission-sig') transmissionSig: string,
    @Headers('paypal-cert-url') certUrl: string,
    @Headers('paypal-auth-algo') authAlgo: string,
  ): Promise<WebhookAck> {
    await this.webhooks.handle(request.rawBody?.toString('utf8') ?? '', {
      transmissionId,
      transmissionTime,
      transmissionSig,
      certUrl,
      authAlgo,
    });
    return WEBHOOK_ACK_BODY;
  }
}
