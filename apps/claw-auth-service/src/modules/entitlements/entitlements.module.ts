import { Module } from '@nestjs/common';
import { AuthRepository } from '../auth/repositories/auth.repository';
import { RolesModule } from '../roles/roles.module';
import { PlansModule } from '../plans/plans.module';
import { QuotaModule } from '../quota/quota.module';
import { EntitlementsInternalController } from './controllers/entitlements-internal.controller';
import { QuotaInternalController } from '../quota/controllers/quota-internal.controller';
import { EntitlementsService } from './services/entitlements.service';

@Module({
  imports: [RolesModule, PlansModule, QuotaModule],
  controllers: [EntitlementsInternalController, QuotaInternalController],
  providers: [EntitlementsService, AuthRepository],
  exports: [EntitlementsService],
})
export class EntitlementsModule {}
