import { Injectable, Logger } from '@nestjs/common';
import {
  PlanFeatureAccessMode,
  type PlanFeatureKey,
  type PlanFeatureRule,
} from '../../../generated/prisma';
import { PlanBillingRepository } from '../../plans/repositories/plan-billing.repository';
import { FeatureUsageRepository } from '../repositories/feature-usage.repository';
import { featurePeriodKey } from '../utilities/feature-window.utility';
import { type FeatureAllowanceSnapshot, type FeatureReservationResult } from '../types/quota.types';

// Feature allowances are enforced here, on the server, against a durable
// ledger. A cleared browser, a second device or a replayed request must never
// hand a Free user a second lifetime trial.
//
// The reserve → consume/release cycle exists so a failed run is not charged:
// the trial is held before execution and only spent once the user actually
// received a result.
@Injectable()
export class FeaturePolicyService {
  private readonly logger = new Logger(FeaturePolicyService.name);

  constructor(
    private readonly planBilling: PlanBillingRepository,
    private readonly usage: FeatureUsageRepository,
  ) {}

  async evaluate(params: {
    userId: string;
    planId: string | null;
    feature: PlanFeatureKey;
    billingPeriodKey: string | null;
  }): Promise<FeatureAllowanceSnapshot> {
    this.logger.debug(`evaluate: user=${params.userId} feature=${params.feature}`);
    const rule = params.planId
      ? await this.planBilling.findFeatureRule(params.planId, params.feature)
      : null;
    // No plan or no rule is an incomplete policy, and an incomplete policy
    // fails CLOSED rather than granting the feature.
    if (!rule || rule.accessMode === PlanFeatureAccessMode.DISABLED) {
      return this.deniedSnapshot(params.feature);
    }
    if (rule.accessMode === PlanFeatureAccessMode.ENABLED) {
      const periodKey = featurePeriodKey(rule.window, new Date(), params.billingPeriodKey);
      const used = await this.usage.countActive({
        userId: params.userId,
        feature: params.feature,
        periodKey,
      });
      return {
        feature: params.feature,
        allowed: true,
        limit: null,
        used,
        remaining: null,
        window: null,
      };
    }
    return this.limitedSnapshot(params, rule);
  }

  private deniedSnapshot(feature: PlanFeatureKey): FeatureAllowanceSnapshot {
    return { feature, allowed: false, limit: null, used: 0, remaining: null, window: null };
  }

  private async limitedSnapshot(
    params: { userId: string; feature: PlanFeatureKey; billingPeriodKey: string | null },
    rule: PlanFeatureRule,
  ): Promise<FeatureAllowanceSnapshot> {
    const limit = rule.limit ?? 0;
    const periodKey = featurePeriodKey(rule.window, new Date(), params.billingPeriodKey);
    const used = await this.usage.countActive({
      userId: params.userId,
      feature: params.feature,
      periodKey,
    });
    return {
      feature: params.feature,
      allowed: used < limit,
      limit,
      used,
      remaining: Math.max(0, limit - used),
      window: rule.window,
    };
  }

  // Holds one run of the allowance. Idempotent per requestId, so a retry of the
  // same request reuses its reservation instead of consuming a second run.
  async reserve(params: {
    userId: string;
    planId: string | null;
    feature: PlanFeatureKey;
    requestId: string;
    billingPeriodKey: string | null;
  }): Promise<FeatureReservationResult> {
    const rule = params.planId
      ? await this.planBilling.findFeatureRule(params.planId, params.feature)
      : null;
    if (!rule || rule.accessMode === PlanFeatureAccessMode.DISABLED) {
      this.logger.warn(`reserve: denied user=${params.userId} feature=${params.feature}`);
      return { ok: false, reason: 'FEATURE_DISABLED', used: 0, limit: 0 };
    }
    const periodKey = featurePeriodKey(rule.window, new Date(), params.billingPeriodKey);
    if (rule.accessMode === PlanFeatureAccessMode.LIMITED) {
      const exhausted = await this.rejectWhenExhausted(params, rule, periodKey);
      if (exhausted) {
        return exhausted;
      }
    }
    const record = await this.usage.reserve({ ...params, window: rule.window, periodKey });
    this.logger.log(`reserve: held user=${params.userId} feature=${params.feature}`);
    return { ok: true, reservationId: record.id };
  }

  private async rejectWhenExhausted(
    params: { userId: string; feature: PlanFeatureKey; requestId: string },
    rule: PlanFeatureRule,
    periodKey: string,
  ): Promise<FeatureReservationResult | null> {
    const limit = rule.limit ?? 0;
    const existing = await this.usage.countActive({
      userId: params.userId,
      feature: params.feature,
      periodKey,
    });
    if (existing < limit) {
      return null;
    }
    this.logger.warn(
      `rejectWhenExhausted: user=${params.userId} feature=${params.feature} used=${existing} limit=${limit}`,
    );
    return { ok: false, reason: 'FEATURE_TRIAL_EXHAUSTED', used: existing, limit };
  }

  async consume(reservationId: string): Promise<void> {
    await this.usage.consume(reservationId);
    this.logger.debug(`consume: reservation=${reservationId}`);
  }

  async release(reservationId: string): Promise<void> {
    await this.usage.release(reservationId);
    this.logger.debug(`release: reservation=${reservationId}`);
  }
}
