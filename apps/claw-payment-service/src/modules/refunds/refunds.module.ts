import { Module } from '@nestjs/common';

import { BillingModule } from '../billing/billing.module';
import { GatewaysModule } from '../gateways/gateways.module';
import { OutboxModule } from '../outbox/outbox.module';
import { RefundController } from './controllers/refund.controller';
import { RefundManager } from './managers/refund.manager';
import { AutomaticCompensationManager } from './managers/automatic-compensation.manager';
import { RefundRepository } from './repositories/refund.repository';
import { RefundCompletionService } from './services/refund-completion.service';
import { PaymentCompensationService } from './services/payment-compensation.service';
import { RefundQueryService } from './services/refund-query.service';
import { RefundWebhookService } from './services/refund-webhook.service';
import { ScheduledJobsModule } from '../scheduled-jobs/scheduled-jobs.module';

@Module({
  imports: [BillingModule, GatewaysModule, OutboxModule, ScheduledJobsModule],
  controllers: [RefundController],
  providers: [
    RefundManager,
    RefundRepository,
    RefundCompletionService,
    RefundQueryService,
    RefundWebhookService,
    PaymentCompensationService,
    AutomaticCompensationManager,
  ],
  exports: [RefundWebhookService, PaymentCompensationService],
})
export class RefundsModule {}
