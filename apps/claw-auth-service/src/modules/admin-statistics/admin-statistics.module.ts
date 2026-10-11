import { Module } from '@nestjs/common';

import { CreditModule } from '../credit/credit.module';
import { PlansModule } from '../plans/plans.module';
import { QuotaModule } from '../quota/quota.module';
import { AdminUsageAnalyticsController } from './controllers/admin-usage-analytics.controller';
import { AdminUsageExplorerController } from './controllers/admin-usage-explorer.controller';
import { AdminUserStatisticsController } from './controllers/admin-user-statistics.controller';
import { AdminUsageAnalyticsRepository } from './repositories/admin-usage-analytics.repository';
import { AdminUsageExplorerRepository } from './repositories/admin-usage-explorer.repository';
import { AdminUsageAnalyticsService } from './services/admin-usage-analytics.service';
import { AdminUsageAuditService } from './services/admin-usage-audit.service';
import { AdminUsageExplorerService } from './services/admin-usage-explorer.service';
import { AdminUserPlanService } from './services/admin-user-plan.service';
import { AdminUserStatisticsService } from './services/admin-user-statistics.service';

/**
 * Operator-facing reporting that spans more than one domain.
 *
 * It exists as its own module because the per-user statistics panel reads the
 * token ledger (quota) and the credit ledger (credit) together, and neither
 * module owns the pair. Hanging it off either one would put a controller in a
 * module whose name does not predict the route, which is how an endpoint
 * becomes unfindable. Nothing here writes.
 */
@Module({
  imports: [QuotaModule, CreditModule, PlansModule],
  controllers: [
    AdminUserStatisticsController,
    AdminUsageAnalyticsController,
    AdminUsageExplorerController,
  ],
  providers: [
    AdminUserStatisticsService,
    AdminUserPlanService,
    AdminUsageAnalyticsService,
    AdminUsageAnalyticsRepository,
    AdminUsageExplorerRepository,
    AdminUsageExplorerService,
    AdminUsageAuditService,
  ],
})
export class AdminStatisticsModule {}
