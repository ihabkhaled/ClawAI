import { Injectable } from '@nestjs/common';

import { parseWebhookBody } from '../utilities/webhook-payload.utility';
import { type WebhookHandlingResult } from '../types/webhook.types';
import { PaymobCardTokenService } from './paymob-card-token.service';
import { PaymobWebhookService } from './paymob-webhook.service';

/**
 * Paymob sends both transaction and card-token objects to an intention's one
 * notification URL. Routing on the untrusted type is safe because both target
 * handlers independently verify HMAC before accepting any state.
 */
@Injectable()
export class PaymobCallbackRouterService {
  constructor(
    private readonly transactions: PaymobWebhookService,
    private readonly cardTokens: PaymobCardTokenService,
  ) {}

  async handle(rawBody: string, receivedHmac: string): Promise<WebhookHandlingResult> {
    const payload = parseWebhookBody(rawBody);
    if (payload?.['type'] === 'TOKEN') {
      return this.cardTokens.handle(rawBody, receivedHmac);
    }
    return this.transactions.handle(rawBody, receivedHmac);
  }
}
