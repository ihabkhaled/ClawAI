import { Module } from '@nestjs/common';

import { BillingModule } from '../billing/billing.module';
import { GatewaysModule } from '../gateways/gateways.module';
import { ScheduledJobsModule } from '../scheduled-jobs/scheduled-jobs.module';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { WebhooksModule } from '../webhooks/webhooks.module';
import { ReconciliationManager } from './managers/reconciliation.manager';
import { ReconciliationRepository } from './repositories/reconciliation.repository';
import { GatewayReconciliationService } from './services/gateway-reconciliation.service';
import { LifecycleReconciliationService } from './services/lifecycle-reconciliation.service';
import { GatewaySubscriptionVaultService } from './services/gateway-subscription-vault.service';
import { ProviderSubscriptionReconciliationService } from './services/provider-subscription-reconciliation.service';
import { TransactionReconciliationService } from './services/transaction-reconciliation.service';

@Module({
  imports: [
    BillingModule,
    GatewaysModule,
    ScheduledJobsModule,
    SubscriptionsModule,
    WebhooksModule,
  ],
  providers: [
    ReconciliationManager,
    ReconciliationRepository,
    GatewayReconciliationService,
    LifecycleReconciliationService,
    GatewaySubscriptionVaultService,
    ProviderSubscriptionReconciliationService,
    TransactionReconciliationService,
  ],
})
export class ReconciliationModule {}
