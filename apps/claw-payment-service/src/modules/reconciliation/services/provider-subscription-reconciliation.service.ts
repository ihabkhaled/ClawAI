import { Injectable, Logger } from '@nestjs/common';
import { BillingGateway, SubscriptionStatus } from '@claw/shared-types';

import {
  ReconciliationClassification,
  ReconciliationEntityType,
  ReconciliationResolution,
} from '../../../common/enums/reconciliation.enum';
import { PaypalAdapter } from '../../gateways/paypal/paypal.adapter';
import { SubscriptionRepository } from '../../subscriptions/repositories/subscription.repository';
import { RECONCILIATION_BATCH_SIZE } from '../constants/reconciliation.constants';
import { ReconciliationRepository } from '../repositories/reconciliation.repository';
import { GatewaySubscriptionVaultService } from './gateway-subscription-vault.service';
import type { Subscription } from '../../../generated/prisma';
import type { ReconciliationCounts } from '../types/reconciliation.types';
import type { PaypalSubscriptionResult } from '../../gateways/paypal/types/paypal.types';

@Injectable()
export class ProviderSubscriptionReconciliationService {
  private readonly logger = new Logger(ProviderSubscriptionReconciliationService.name);

  constructor(
    private readonly subscriptions: SubscriptionRepository,
    private readonly paypal: PaypalAdapter,
    private readonly vault: GatewaySubscriptionVaultService,
    private readonly reconciliation: ReconciliationRepository,
  ) {}

  async reconcile(runId: string): Promise<ReconciliationCounts> {
    const total = await this.subscriptions.countProviderBoundNonTerminal();
    const candidates =
      await this.subscriptions.findProviderBoundNonTerminal(RECONCILIATION_BATCH_SIZE);
    let quarantinedCount = 0;
    for (const candidate of candidates) {
      quarantinedCount += (await this.reconcileOne(runId, candidate)) ? 1 : 0;
    }
    return {
      scannedCount: candidates.length,
      repairedCount: 0,
      quarantinedCount,
      unprocessedCount: Math.max(0, total - candidates.length),
    };
  }

  private async reconcileOne(runId: string, subscription: Subscription): Promise<boolean> {
    if (subscription.gateway !== BillingGateway.PAYPAL) {
      await this.record(
        runId,
        subscription,
        ReconciliationClassification.UNSUPPORTED_GATEWAY,
        'NO_PROVIDER_SUBSCRIPTION_API',
      );
      return true;
    }
    try {
      const providerId = this.vault.decrypt(subscription);
      if (providerId === null) {
        await this.record(
          runId,
          subscription,
          ReconciliationClassification.MISSING_PROVIDER_REFERENCE,
          null,
        );
        return true;
      }
      const provider = await this.paypal.getSubscription(providerId);
      const classification = ProviderSubscriptionReconciliationService.classify(
        subscription,
        provider,
      );
      if (classification === null) {
        return false;
      }
      await this.record(runId, subscription, classification, provider.status);
      return true;
    } catch {
      this.logger.error(`reconcileOne: gateway read failed subscription=${subscription.id}`);
      await this.record(
        runId,
        subscription,
        ReconciliationClassification.GATEWAY_UNAVAILABLE,
        null,
      );
      return true;
    }
  }

  private async record(
    runId: string,
    subscription: Subscription,
    classification: ReconciliationClassification,
    providerStatus: string | null,
  ): Promise<void> {
    await this.reconciliation.recordFinding({
      runId,
      entityType: ReconciliationEntityType.SUBSCRIPTION,
      entityId: subscription.id,
      gateway: subscription.gateway,
      classification,
      localStatus: subscription.status,
      providerStatus,
      resolution: ReconciliationResolution.QUARANTINED,
      repairedAt: null,
    });
  }

  private static classify(
    subscription: Subscription,
    provider: PaypalSubscriptionResult,
  ): ReconciliationClassification | null {
    if (
      provider.isActive &&
      (subscription.status === SubscriptionStatus.ACTIVE ||
        subscription.status === SubscriptionStatus.CANCEL_AT_PERIOD_END)
    ) {
      return null;
    }
    if (provider.isActive && subscription.status === SubscriptionStatus.PAST_DUE) {
      return ReconciliationClassification.LOCAL_PAST_DUE_PROVIDER_ACTIVE;
    }
    if (
      provider.isActive &&
      (subscription.status === SubscriptionStatus.PENDING ||
        subscription.status === SubscriptionStatus.INCOMPLETE)
    ) {
      return ReconciliationClassification.LOCAL_PENDING_PROVIDER_ACTIVE;
    }
    return ReconciliationClassification.LOCAL_ACTIVE_PROVIDER_INACTIVE;
  }
}
