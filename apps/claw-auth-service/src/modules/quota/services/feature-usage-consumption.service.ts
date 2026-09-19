import { Injectable, Logger } from '@nestjs/common';

import { EntitlementsService } from '../../entitlements/services/entitlements.service';
import { FeaturePolicyService } from './feature-policy.service';
import { type PlanFeatureKey } from '../../../generated/prisma';
import { FeatureSettlement } from '../enums/feature-settlement.enum';
import type { FeatureReservationDecision } from '../types/quota.types';

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
    const entitlements = await this.entitlements.getEnforcedForUser(input.userId);
    if (entitlements.isAdmin || entitlements.plan === null) {
      await this.policy.observe(input);
      this.logger.debug(`record: observed unmetered user=${input.userId} feature=${input.feature}`);
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

  /**
   * Holds one run BEFORE the work starts, so an exhausted allowance refuses
   * the request instead of being logged after it was served (F3d, ADR-110).
   * `record` above only counts; this is the first metered feature that can
   * say no. Admins and plan-less callers are observed, never refused.
   */
  async reserve(input: {
    userId: string;
    feature: PlanFeatureKey;
    requestId: string;
  }): Promise<FeatureReservationDecision> {
    const entitlements = await this.entitlements.getEnforcedForUser(input.userId);
    if (entitlements.isAdmin || entitlements.plan === null) {
      await this.policy.observe(input);
      return { allowed: true, reservationId: null };
    }
    const reservation = await this.policy.reserve({
      ...input,
      planId: entitlements.plan.id,
      billingPeriodKey: null,
    });
    if (reservation.ok) {
      return { allowed: true, reservationId: reservation.reservationId };
    }
    const snapshot = await this.policy.evaluate({
      userId: input.userId,
      planId: entitlements.plan.id,
      feature: input.feature,
      billingPeriodKey: null,
    });
    this.logger.warn(
      `reserve: refused user=${input.userId} feature=${input.feature} reason=${reservation.reason}`,
    );
    return {
      allowed: false,
      reason: reservation.reason,
      used: reservation.used,
      limit: reservation.limit,
      window: snapshot.window,
    };
  }

  async settle(reservationId: string, outcome: FeatureSettlement): Promise<void> {
    if (outcome === FeatureSettlement.CONSUME) {
      await this.policy.consume(reservationId);
      return;
    }
    await this.policy.release(reservationId);
  }
}
