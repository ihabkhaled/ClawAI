import { Module } from '@nestjs/common';

import { BillingModule } from '../billing/billing.module';
import { FxModule } from '../fx/fx.module';
import { GatewaysModule } from '../gateways/gateways.module';
import { PlanCatalogModule } from '../plan-catalog/plan-catalog.module';
import { RefundsModule } from '../refunds/refunds.module';
import { WebhooksModule } from '../webhooks/webhooks.module';
import { CheckoutController } from './controllers/checkout.controller';
import { ChargeResolverService } from './services/charge-resolver.service';
import { CheckoutService } from './services/checkout.service';
import { PaymentMethodSetupService } from './services/payment-method-setup.service';
import { PaypalCheckoutCompletionService } from './services/paypal-checkout-completion.service';

@Module({
  imports: [
    BillingModule,
    FxModule,
    GatewaysModule,
    PlanCatalogModule,
    RefundsModule,
    WebhooksModule,
  ],
  controllers: [CheckoutController],
  providers: [
    CheckoutService,
    ChargeResolverService,
    PaymentMethodSetupService,
    PaypalCheckoutCompletionService,
  ],
  exports: [CheckoutService, ChargeResolverService],
})
export class CheckoutModule {}
