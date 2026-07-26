import { Module } from '@nestjs/common';

import { BillingModule } from '../billing/billing.module';
import { GatewaysModule } from '../gateways/gateways.module';
import { PaymobWebhookController } from './controllers/paymob-webhook.controller';
import { PaypalWebhookController } from './controllers/paypal-webhook.controller';
import { BillingCustomerRepository } from './repositories/billing-customer.repository';
import { WebhookEventRepository } from './repositories/webhook-event.repository';
import { PaymentActivationService } from './services/payment-activation.service';
import { PaymobWebhookService } from './services/paymob-webhook.service';
import { PaypalWebhookService } from './services/paypal-webhook.service';

@Module({
  imports: [BillingModule, GatewaysModule],
  controllers: [PaypalWebhookController, PaymobWebhookController],
  providers: [
    PaypalWebhookService,
    PaymobWebhookService,
    PaymentActivationService,
    WebhookEventRepository,
    BillingCustomerRepository,
  ],
  exports: [PaymentActivationService, WebhookEventRepository],
})
export class WebhooksModule {}
