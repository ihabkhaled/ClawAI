import { Module } from '@nestjs/common';
import { RedisModule } from '../../infrastructure/redis/redis.module';
import { PlansModule } from '../plans/plans.module';
import { QuotaService } from './services/quota.service';
import { FeaturePolicyService } from './services/feature-policy.service';
import { TokenLedgerRepository } from './repositories/token-ledger.repository';
import { WeightedUsageRepository } from './repositories/weighted-usage.repository';
import { FeatureUsageRepository } from './repositories/feature-usage.repository';
import { ProviderCostMetricsInternalController } from './controllers/provider-cost-metrics-internal.controller';
import { ProviderCostMetricsService } from './services/provider-cost-metrics.service';

// QuotaService + ledgers only. The internal quota HTTP controller lives in
// EntitlementsModule (it needs EntitlementsService to resolve a user's daily
// limit) — keeping the dependency one-directional avoids a circular import.
//
// PlansModule is imported for PlanBillingRepository, which owns the feature
// rules the policy service reads. Plans does not depend on Quota, so this stays
// one-directional too.
@Module({
  imports: [RedisModule, PlansModule],
  controllers: [ProviderCostMetricsInternalController],
  providers: [
    QuotaService,
    FeaturePolicyService,
    TokenLedgerRepository,
    WeightedUsageRepository,
    FeatureUsageRepository,
    ProviderCostMetricsService,
  ],
  exports: [
    QuotaService,
    FeaturePolicyService,
    TokenLedgerRepository,
    WeightedUsageRepository,
    FeatureUsageRepository,
  ],
})
export class QuotaModule {}
