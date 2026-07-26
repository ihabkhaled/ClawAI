import { Module } from '@nestjs/common';

import { BillingModule } from '../billing/billing.module';
import { GatewaysModule } from '../gateways/gateways.module';
import { PaymentMethodRepository } from '../subscriptions/repositories/payment-method.repository';
import { SubscriptionRepository } from '../subscriptions/repositories/subscription.repository';
import { PaymentMethodVaultService } from '../subscriptions/services/payment-method-vault.service';
import { PaymobWebhookController } from './controllers/paymob-webhook.controller';
import { PaypalWebhookController } from './controllers/paypal-webhook.controller';
import { BillingCustomerRepository } from './repositories/billing-customer.repository';
import { WebhookEventRepository } from './repositories/webhook-event.repository';
import { PaymentActivationService } from './services/payment-activation.service';
import { PaymentReversalService } from './services/payment-reversal.service';
import { PaymobCardTokenService } from './services/paymob-card-token.service';
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
    PaymobCardTokenService,
    PaymentActivationService,
    PaymentReversalService,
    PaymentMethodVaultService,
    WebhookEventRepository,
    BillingCustomerRepository,
    SubscriptionRepository,
    PaymentMethodRepository,
  ],
  exports: [
    PaymentActivationService,
    PaymentReversalService,
    PaymentMethodVaultService,
    WebhookEventRepository,
  ],
})
export class WebhooksModule {}
