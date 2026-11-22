import { Module } from '@nestjs/common';
import { EntitlementsAdapter, PaygMeter } from '@claw/shared-entitlements';

import { AppConfig } from '../../app/config/app.config';
import { RealtimeModule } from '../realtime/realtime.module';
import { LIVE_ENTITLEMENTS_ADAPTER } from './constants/live-billing.constants';
import { LiveBlockSettlementManager } from './managers/live-block-settlement.manager';
import { LivePaidBlockManager } from './managers/live-paid-block.manager';
import { LivePlanResolverManager } from './managers/live-plan-resolver.manager';
import { LiveBillingRepository } from './repositories/live-billing.repository';
import { BillingService } from './services/billing.service';

/**
 * Live usage billing. Provides its own PaygMeter and EntitlementsAdapter
 * (pointed at auth-service with INTER_SERVICE_AUTH_TOKEN), so it does not
 * depend on a global EntitlementsModule being registered.
 */
@Module({
  imports: [RealtimeModule],
  providers: [
    {
      provide: PaygMeter,
      useFactory: (): PaygMeter =>
        new PaygMeter({
          authServiceUrl: AppConfig.get().AUTH_SERVICE_URL,
          interServiceToken: AppConfig.get().INTER_SERVICE_AUTH_TOKEN,
        }),
    },
    {
      provide: LIVE_ENTITLEMENTS_ADAPTER,
      useFactory: (): EntitlementsAdapter =>
        new EntitlementsAdapter({
          authServiceUrl: AppConfig.get().AUTH_SERVICE_URL,
          serviceToken: AppConfig.get().INTER_SERVICE_AUTH_TOKEN,
        }),
    },
    LiveBillingRepository,
    LivePlanResolverManager,
    LivePaidBlockManager,
    LiveBlockSettlementManager,
    BillingService,
  ],
  exports: [BillingService],
})
export class BillingModule {}
