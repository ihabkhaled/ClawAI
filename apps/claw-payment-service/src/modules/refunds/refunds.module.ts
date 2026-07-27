import { Module } from '@nestjs/common';

import { BillingModule } from '../billing/billing.module';
import { GatewaysModule } from '../gateways/gateways.module';
import { OutboxModule } from '../outbox/outbox.module';
import { RefundController } from './controllers/refund.controller';
import { RefundManager } from './managers/refund.manager';
import { RefundRepository } from './repositories/refund.repository';
import { RefundCompletionService } from './services/refund-completion.service';
import { RefundQueryService } from './services/refund-query.service';
import { RefundWebhookService } from './services/refund-webhook.service';

@Module({
  imports: [BillingModule, GatewaysModule, OutboxModule],
  controllers: [RefundController],
  providers: [
    RefundManager,
    RefundRepository,
    RefundCompletionService,
    RefundQueryService,
    RefundWebhookService,
  ],
  exports: [RefundWebhookService],
})
export class RefundsModule {}
