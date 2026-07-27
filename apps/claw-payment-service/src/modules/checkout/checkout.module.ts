import { Module } from '@nestjs/common';

import { BillingModule } from '../billing/billing.module';
import { FxModule } from '../fx/fx.module';
import { GatewaysModule } from '../gateways/gateways.module';
import { PlanCatalogModule } from '../plan-catalog/plan-catalog.module';
import { CheckoutController } from './controllers/checkout.controller';
import { ChargeResolverService } from './services/charge-resolver.service';
import { CheckoutService } from './services/checkout.service';
import { PaymentMethodSetupService } from './services/payment-method-setup.service';

@Module({
  imports: [BillingModule, FxModule, GatewaysModule, PlanCatalogModule],
  controllers: [CheckoutController],
  providers: [CheckoutService, ChargeResolverService, PaymentMethodSetupService],
  exports: [CheckoutService, ChargeResolverService],
})
export class CheckoutModule {}
