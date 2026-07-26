import { Module } from '@nestjs/common';

import { BillingModule } from '../billing/billing.module';
import { CheckoutModule } from '../checkout/checkout.module';
import { OutboxModule } from '../outbox/outbox.module';
import { PlanCatalogModule } from '../plan-catalog/plan-catalog.module';
import { SubscriptionsController } from './controllers/subscriptions.controller';
import { InvoiceRepository } from './repositories/invoice.repository';
import { PaymentMethodRepository } from './repositories/payment-method.repository';
import { SubscriptionRepository } from './repositories/subscription.repository';
import { PaymentMethodService } from './services/payment-method.service';
import { PlanChangeService } from './services/plan-change.service';
import { ScheduledDowngradeService } from './services/scheduled-downgrade.service';
import { SubscriptionCancelService } from './services/subscription-cancel.service';
import { SubscriptionQueryService } from './services/subscription-query.service';

@Module({
  imports: [BillingModule, CheckoutModule, OutboxModule, PlanCatalogModule],
  controllers: [SubscriptionsController],
  providers: [
    SubscriptionQueryService,
    PlanChangeService,
    ScheduledDowngradeService,
    SubscriptionCancelService,
    PaymentMethodService,
    SubscriptionRepository,
    InvoiceRepository,
    PaymentMethodRepository,
  ],
  exports: [SubscriptionQueryService, SubscriptionRepository],
})
export class SubscriptionsModule {}
