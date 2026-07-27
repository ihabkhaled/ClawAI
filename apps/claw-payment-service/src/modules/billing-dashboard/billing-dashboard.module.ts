import { Module } from '@nestjs/common';

import { ProviderCostClient } from './clients/provider-cost.client';
import { BillingDashboardController } from './controllers/billing-dashboard.controller';
import { BillingDashboardRepository } from './repositories/billing-dashboard.repository';
import { BillingDashboardService } from './services/billing-dashboard.service';

@Module({
  controllers: [BillingDashboardController],
  providers: [BillingDashboardRepository, BillingDashboardService, ProviderCostClient],
})
export class BillingDashboardModule {}
