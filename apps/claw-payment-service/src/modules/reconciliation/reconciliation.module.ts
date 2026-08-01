import { Module } from '@nestjs/common';

import { BillingModule } from '../billing/billing.module';
import { GatewaysModule } from '../gateways/gateways.module';
import { RefundsModule } from '../refunds/refunds.module';
import { ScheduledJobsModule } from '../scheduled-jobs/scheduled-jobs.module';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { WebhooksModule } from '../webhooks/webhooks.module';
import { ReconciliationAdminController } from './controllers/reconciliation-admin.controller';
import { ReconciliationManager } from './managers/reconciliation.manager';
import { ReconciliationRepository } from './repositories/reconciliation.repository';
import { GatewayReconciliationService } from './services/gateway-reconciliation.service';
import { LifecycleReconciliationService } from './services/lifecycle-reconciliation.service';
import { GatewaySubscriptionVaultService } from './services/gateway-subscription-vault.service';
import { ProviderSubscriptionReconciliationService } from './services/provider-subscription-reconciliation.service';
import { TransactionReconciliationService } from './services/transaction-reconciliation.service';
import { PlanCatalogModule } from '../plan-catalog/plan-catalog.module';
import { PlanRetirementClient } from './clients/plan-retirement.client';
import { PlanRetirementReconciliationService } from './services/plan-retirement-reconciliation.service';

@Module({
  controllers: [ReconciliationAdminController],
  imports: [
    BillingModule,
    GatewaysModule,
    RefundsModule,
    ScheduledJobsModule,
    SubscriptionsModule,
    WebhooksModule,
    PlanCatalogModule,
  ],
  providers: [
    ReconciliationManager,
    ReconciliationRepository,
    GatewayReconciliationService,
    LifecycleReconciliationService,
    GatewaySubscriptionVaultService,
    ProviderSubscriptionReconciliationService,
    TransactionReconciliationService,
    PlanRetirementClient,
    PlanRetirementReconciliationService,
  ],
})
export class ReconciliationModule {}
