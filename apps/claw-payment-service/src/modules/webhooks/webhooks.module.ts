import { Module } from '@nestjs/common';

import { BillingModule } from '../billing/billing.module';
import { GatewaysModule } from '../gateways/gateways.module';
import { SubscriptionRepository } from '../subscriptions/repositories/subscription.repository';
import { PaymobWebhookController } from './controllers/paymob-webhook.controller';
import { PaypalWebhookController } from './controllers/paypal-webhook.controller';
import { BillingCustomerRepository } from './repositories/billing-customer.repository';
import { WebhookEventRepository } from './repositories/webhook-event.repository';
import { PaymentActivationService } from './services/payment-activation.service';
import { PaymentReversalService } from './services/payment-reversal.service';
import { PaymobWebhookService } from './services/paymob-webhook.service';
import { PaypalWebhookService } from './services/paypal-webhook.service';

// SubscriptionRepository is provided directly rather than by importing
// SubscriptionsModule: that module imports this one (its controllers need the
// activation service), and importing it back would be a circular module graph.
// The repository is stateless data access, so a second provider instance is
// harmless — a service with in-memory state would not be.
@Module({
  imports: [BillingModule, GatewaysModule],
  controllers: [PaypalWebhookController, PaymobWebhookController],
  providers: [
    PaypalWebhookService,
    PaymobWebhookService,
    PaymentActivationService,
    PaymentReversalService,
    WebhookEventRepository,
    BillingCustomerRepository,
    SubscriptionRepository,
  ],
  exports: [PaymentActivationService, PaymentReversalService, WebhookEventRepository],
})
export class WebhooksModule {}
