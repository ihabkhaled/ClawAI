import { Module } from '@nestjs/common';
import { AuthRepository } from '../auth/repositories/auth.repository';
import { RolesModule } from '../roles/roles.module';
import { PlansModule } from '../plans/plans.module';
import { QuotaModule } from '../quota/quota.module';
import { EntitlementsInternalController } from './controllers/entitlements-internal.controller';
import { MeEntitlementsController } from './controllers/me-entitlements.controller';
import { QuotaInternalController } from '../quota/controllers/quota-internal.controller';
import { EntitlementsService } from './services/entitlements.service';
import { UsageViewService } from './services/usage-view.service';
import { EntitlementApplierService } from './services/entitlement-applier.service';
import { EntitlementInboxService } from './services/entitlement-inbox.service';
import { EntitlementInboxRepository } from './repositories/entitlement-inbox.repository';

@Module({
  imports: [RolesModule, PlansModule, QuotaModule],
  controllers: [EntitlementsInternalController, MeEntitlementsController, QuotaInternalController],
  providers: [
    EntitlementsService,
    AuthRepository,
    EntitlementInboxService,
    EntitlementApplierService,
    EntitlementInboxRepository,
  ],
  exports: [EntitlementsService, EntitlementInboxService, UsageViewService],
})
export class EntitlementsModule {}
