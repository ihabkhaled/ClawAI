import { Module } from '@nestjs/common';
import { PlansController } from './controllers/plans.controller';
import { PlansService } from './services/plans.service';
import { PlansRepository } from './repositories/plans.repository';
import { PlanBillingRepository } from './repositories/plan-billing.repository';

@Module({
  controllers: [PlansController],
  providers: [PlansService, PlansRepository, PlanBillingRepository],
  exports: [PlansService, PlansRepository, PlanBillingRepository],
})
export class PlansModule {}
