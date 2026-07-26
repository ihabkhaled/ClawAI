import { Module } from '@nestjs/common';
import { PlansController } from './controllers/plans.controller';
import { PlansInternalController } from './controllers/plans-internal.controller';
import { PlansService } from './services/plans.service';
import { PlanCatalogService } from './services/plan-catalog.service';
import { PlansRepository } from './repositories/plans.repository';
import { PlanBillingRepository } from './repositories/plan-billing.repository';

@Module({
  controllers: [PlansController, PlansInternalController],
  providers: [PlansService, PlanCatalogService, PlansRepository, PlanBillingRepository],
  exports: [PlansService, PlanCatalogService, PlansRepository, PlanBillingRepository],
})
export class PlansModule {}
