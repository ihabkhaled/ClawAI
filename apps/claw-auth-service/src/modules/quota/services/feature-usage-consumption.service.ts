import { Injectable, Logger } from '@nestjs/common';

import { EntitlementsService } from '../../entitlements/services/entitlements.service';
import { FeaturePolicyService } from './feature-policy.service';
import { type PlanFeatureKey } from '../../../generated/prisma';

@Injectable()
export class FeatureUsageConsumptionService {
  private readonly logger = new Logger(FeatureUsageConsumptionService.name);

  constructor(
    private readonly entitlements: EntitlementsService,
    private readonly policy: FeaturePolicyService,
  ) {}

  async record(input: {
    userId: string;
    feature: PlanFeatureKey;
    requestId: string;
  }): Promise<void> {
    const entitlements = await this.entitlements.getForUser(input.userId);
    if (entitlements.isAdmin || entitlements.plan === null) {
      this.logger.debug(`record: unmetered user=${input.userId} feature=${input.feature}`);
      return;
    }
    const reservation = await this.policy.reserve({
      ...input,
      planId: entitlements.plan.id,
      billingPeriodKey: null,
    });
    if (!reservation.ok) {
      this.logger.warn(`record: rejected user=${input.userId} feature=${input.feature}`);
      return;
    }
    await this.policy.consume(reservation.reservationId);
  }
}
