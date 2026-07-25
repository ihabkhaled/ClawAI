import { Module } from '@nestjs/common';

import { OutboxModule } from '../outbox/outbox.module';
import { CheckoutSessionRepository } from './repositories/checkout-session.repository';
import { ProrationQuoteRepository } from './repositories/proration-quote.repository';
import { ProrationService } from './services/proration.service';
import { SubscriptionLifecycleService } from './services/subscription-lifecycle.service';

@Module({
  imports: [OutboxModule],
  providers: [
    ProrationService,
    SubscriptionLifecycleService,
    CheckoutSessionRepository,
    ProrationQuoteRepository,
  ],
  exports: [ProrationService, SubscriptionLifecycleService, CheckoutSessionRepository],
})
export class BillingModule {}
