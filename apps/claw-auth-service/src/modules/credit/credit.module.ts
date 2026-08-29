import { Module } from '@nestjs/common';

import { AuthRepository } from '../auth/repositories/auth.repository';
import { EntitlementInboxRepository } from '../entitlements/repositories/entitlement-inbox.repository';
import { PlansModule } from '../plans/plans.module';
import { QuotaModule } from '../quota/quota.module';
import { SystemSettingsModule } from '../system-settings/system-settings.module';
import { ConnectorPolicyClient } from './clients/connector-policy.client';
import { ModelRateClient } from './clients/model-rate.client';
import { CreditTopupConsumer } from './consumers/credit-topup.consumer';
import { ModelCostPublishedConsumer } from './consumers/model-cost-published.consumer';
import { AdminCreditController } from './controllers/admin-credit.controller';
import { CreditController } from './controllers/credit.controller';
import { CreditInternalController } from './controllers/credit-internal.controller';
import { CreditReservationManager } from './managers/credit-reservation.manager';
import { CreditLedgerRepository } from './repositories/credit-ledger.repository';
import { CreditPackageRepository } from './repositories/credit-package.repository';
import { CreditWalletRepository } from './repositories/credit-wallet.repository';
import { CreditAccountService } from './services/credit-account.service';
import { CreditEventService } from './services/credit-event.service';
import { CreditGrantService } from './services/credit-grant.service';
import { CreditPackageService } from './services/credit-package.service';
import { CreditSweeperService } from './services/credit-sweeper.service';
import { CreditTopupInboxService } from './services/credit-topup-inbox.service';
import { CreditWalletService } from './services/credit-wallet.service';

/**
 * PAYG credit: the wallet, its ledger, the reservation chokepoint and the
 * top-up catalog.
 *
 * `QuotaModule` is imported for `WeightedUsageRepository` — the PAYG hold IS a
 * weighted usage record, not a second reservation table with its own lifecycle
 * (ADR-080). `PlansModule` supplies the plan whose provider-cost ceiling is the
 * period grant. `SystemSettingsModule` supplies the kill switch.
 *
 * `AuthRepository` and `EntitlementInboxRepository` are provided directly
 * rather than by importing their modules, following `EntitlementsModule`: auth
 * already depends on plans and roles, and importing either here would close a
 * cycle. Both are stateless data access, so a second provider instance is
 * harmless — a service with in-memory state would not be.
 *
 * The credit inbox shares `entitlement_inbox_events` with the entitlement
 * consumer on purpose: one table, one unique `eventId`, so a single
 * reconciliation sweep covers every at-least-once billing event rather than
 * two half-sweeps that each believe the other is watching.
 */
@Module({
  imports: [QuotaModule, PlansModule, SystemSettingsModule],
  controllers: [CreditInternalController, CreditController, AdminCreditController],
  providers: [
    CreditWalletRepository,
    CreditLedgerRepository,
    CreditPackageRepository,
    CreditWalletService,
    CreditGrantService,
    CreditAccountService,
    CreditPackageService,
    CreditEventService,
    CreditSweeperService,
    CreditTopupInboxService,
    CreditReservationManager,
    ModelRateClient,
    ConnectorPolicyClient,
    ModelCostPublishedConsumer,
    CreditTopupConsumer,
    AuthRepository,
    EntitlementInboxRepository,
  ],
  exports: [CreditReservationManager, CreditWalletService, CreditGrantService],
})
export class CreditModule {}
