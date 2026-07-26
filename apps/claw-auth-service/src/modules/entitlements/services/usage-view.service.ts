import { Injectable, Logger } from '@nestjs/common';

import { RedisService } from '../../../infrastructure/redis/redis.service';
import { PlansRepository } from '../../plans/repositories/plans.repository';
import { AuthRepository } from '../../auth/repositories/auth.repository';
import { weightedQuotaKey } from '../../quota/constants/quota-redis.constants';
import { buildPeriodKeys } from '../../quota/utilities/quota-reservation.utility';
import { FeaturePolicyService } from '../../quota/services/feature-policy.service';
import {
  type FeatureAllowanceView,
  type UsagePlanLimits,
  type UsageWindowView,
  type UserUsageView,
} from '../types/usage-view.types';
import { readWindowCounter } from '../utilities/usage-view.utility';
import { PlanFeatureKey } from '../../../generated/prisma';

/**
 * Assembles what a user has consumed this day, week and month, plus which
 * metered features they have left.
 *
 * Read-only and reservation-free: this never touches the Lua reservation path,
 * so opening the billing page cannot consume quota.
 */
@Injectable()
export class UsageViewService {
  private readonly logger = new Logger(UsageViewService.name);

  constructor(
    private readonly redis: RedisService,
    private readonly users: AuthRepository,
    private readonly plans: PlansRepository,
    private readonly features: FeaturePolicyService,
  ) {}

  async getForUser(userId: string): Promise<UserUsageView> {
    this.logger.debug(`getForUser: ${userId}`);
    const plan = await this.resolvePlan(userId);
    const periods = buildPeriodKeys(new Date());

    const [day, week, month] = await Promise.all([
      this.readWindow(userId, 'DAY', periods.dayKey, plan?.dailyTokenQuota ?? null),
      this.readWindow(userId, 'WEEK', periods.weekKey, plan?.weeklyTokenQuota ?? null),
      this.readWindow(userId, 'MONTH', periods.monthKey, plan?.monthlyTokenQuota ?? null),
    ]);

    return { day, week, month, features: await this.readFeatures(userId, plan?.id ?? null) };
  }

  // A user on no plan is a normal state, not an error: every window then
  // reports a null limit, which the UI renders as unlimited-but-unpriced rather
  // than blowing up.
  private async resolvePlan(userId: string): Promise<UsagePlanLimits | null> {
    const user = await this.users.findUserById(userId);
    const activePlanId = user?.activePlanId ?? null;
    return activePlanId === null ? null : this.plans.findById(activePlanId);
  }

  private async readWindow(
    userId: string,
    window: string,
    periodKey: string,
    limit: number | null,
  ): Promise<UsageWindowView> {
    const raw = await this.redis.get(weightedQuotaKey(userId, window, periodKey));
    return readWindowCounter(raw, limit, periodKey);
  }

  private async readFeatures(
    userId: string,
    planId: string | null,
  ): Promise<FeatureAllowanceView[]> {
    // billingPeriodKey stays null: the policy service derives the right bucket
    // from each rule's own window, and a LIFETIME trial must not be handed a
    // period key that would reset it.
    return Promise.all(
      Object.values(PlanFeatureKey).map((feature) =>
        this.features.evaluate({ userId, planId, feature, billingPeriodKey: null }),
      ),
    );
  }
}
