import { Module } from '@nestjs/common';

import { WebhookReceiverController } from './controllers/webhook-receiver.controller';
import { WebhookRateLimiterManager } from './managers/webhook-rate-limiter.manager';
import { WebhookReceiverManager } from './managers/webhook-receiver.manager';
import { WebhookDeliveryRepository } from './repositories/webhook-delivery.repository';

@Module({
  controllers: [WebhookReceiverController],
  providers: [WebhookReceiverManager, WebhookDeliveryRepository, WebhookRateLimiterManager],
  exports: [WebhookReceiverManager, WebhookDeliveryRepository],
})
export class WebhooksModule {}
