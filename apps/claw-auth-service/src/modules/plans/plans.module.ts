import { Module } from '@nestjs/common';
import { PlansController } from './controllers/plans.controller';
import { PlansInternalController } from './controllers/plans-internal.controller';
import { PlansService } from './services/plans.service';
import { PlanCatalogService } from './services/plan-catalog.service';
import { PlanIntervalPricingService } from './services/plan-interval-pricing.service';
import { PlansRepository } from './repositories/plans.repository';
import { PlanBillingRepository } from './repositories/plan-billing.repository';
import { ExposedModelClient } from './clients/exposed-model.client';

@Module({
  controllers: [PlansController, PlansInternalController],
  providers: [
    PlansService,
    PlanCatalogService,
    PlanIntervalPricingService,
    PlansRepository,
    PlanBillingRepository,
    ExposedModelClient,
  ],
  exports: [
    PlansService,
    PlanCatalogService,
    PlanIntervalPricingService,
    PlansRepository,
    PlanBillingRepository,
  ],
})
export class PlansModule {}
