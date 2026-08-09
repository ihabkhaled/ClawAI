import { Module } from '@nestjs/common';

import { BillingModule } from '../billing/billing.module';
import { FxModule } from '../fx/fx.module';
import { GatewaysModule } from '../gateways/gateways.module';
import { PlanCatalogModule } from '../plan-catalog/plan-catalog.module';
import { RefundsModule } from '../refunds/refunds.module';
import { WebhooksModule } from '../webhooks/webhooks.module';
import { GatewayConfigModule } from '../gateway-config/gateway-config.module';
import { CheckoutController } from './controllers/checkout.controller';
import { ChargeResolverService } from './services/charge-resolver.service';
import { CheckoutService } from './services/checkout.service';
import { PaymentMethodSetupService } from './services/payment-method-setup.service';
import { PaymobCheckoutCompletionService } from './services/paymob-checkout-completion.service';
import { PaypalCheckoutCompletionService } from './services/paypal-checkout-completion.service';

@Module({
  imports: [
    BillingModule,
    FxModule,
    GatewaysModule,
    PlanCatalogModule,
    RefundsModule,
    WebhooksModule,
    GatewayConfigModule,
  ],
  controllers: [CheckoutController],
  providers: [
    CheckoutService,
    ChargeResolverService,
    PaymentMethodSetupService,
    PaymobCheckoutCompletionService,
    PaypalCheckoutCompletionService,
  ],
  exports: [CheckoutService, ChargeResolverService],
})
export class CheckoutModule {}
