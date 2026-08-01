import { Injectable, Logger } from '@nestjs/common';
import { UserRole } from '@claw/shared-types';

import { PlansRepository } from '../../plans/repositories/plans.repository';
import { AuthRepository } from '../../auth/repositories/auth.repository';
import { TokenLedgerRepository } from '../../quota/repositories/token-ledger.repository';
import { buildPeriodKeys } from '../../quota/utilities/quota-reservation.utility';
import { FeaturePolicyService } from '../../quota/services/feature-policy.service';
import {
  type FeatureAllowanceView,
  type UsageDateRange,
  type UsagePlanContext,
  type UsageWindowView,
  type UserUsageView,
} from '../types/usage-view.types';
import { buildUsageDateRanges } from '../utilities/usage-date-range.utility';
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
    private readonly ledger: TokenLedgerRepository,
    private readonly users: AuthRepository,
    private readonly plans: PlansRepository,
    private readonly features: FeaturePolicyService,
  ) {}

  async getForUser(userId: string): Promise<UserUsageView> {
    this.logger.debug(`getForUser: ${userId}`);
    const context = await this.resolvePlanContext(userId);
    const periods = buildPeriodKeys(new Date());
    const ranges = buildUsageDateRanges(new Date());

    const [day, week, month] = await Promise.all([
      this.readWindow(userId, ranges.day, periods.dayKey, context.plan?.dailyTokenQuota ?? null),
      this.readWindow(userId, ranges.week, periods.weekKey, context.plan?.weeklyTokenQuota ?? null),
      this.readWindow(
        userId,
        ranges.month,
        periods.monthKey,
        context.plan?.monthlyTokenQuota ?? null,
      ),
    ]);

    return {
      day,
      week,
      month,
      features: await this.readFeatures(
        userId,
        context.plan?.id ?? null,
        context.observeUnmeteredFeatures,
      ),
    };
  }

  // A user on no plan is a normal state, not an error: every window then
  // reports a null limit, which the UI renders as unlimited-but-unpriced rather
  // than blowing up.
  private async resolvePlanContext(userId: string): Promise<UsagePlanContext> {
    const user = await this.users.findUserById(userId);
    const activePlanId = user?.activePlanId ?? null;
    const observeUnmeteredFeatures = user?.role === UserRole.ADMIN || activePlanId === null;
    if (activePlanId === null || user?.role === UserRole.ADMIN) {
      return { plan: null, observeUnmeteredFeatures };
    }
    const plan =
      (await this.plans.findEffectiveForUser(userId, new Date())) ??
      (await this.plans.findDefault());
    return { plan, observeUnmeteredFeatures };
  }

  private async readWindow(
    userId: string,
    range: UsageDateRange,
    periodKey: string,
    limit: number | null,
  ): Promise<UsageWindowView> {
    const used = await this.ledger.sumTotalTokens({ userId, ...range });
    return {
      used,
      limit,
      remaining: limit === null ? null : Math.max(0, limit - used),
      periodKey,
    };
  }

  private async readFeatures(
    userId: string,
    planId: string | null,
    observeUnmetered: boolean,
  ): Promise<FeatureAllowanceView[]> {
    // billingPeriodKey stays null: the policy service derives the right bucket
    // from each rule's own window, and a LIFETIME trial must not be handed a
    // period key that would reset it.
    return Promise.all(
      Object.values(PlanFeatureKey).map((feature) => {
        if (observeUnmetered) {
          return this.features.evaluateObserved({ userId, feature });
        }
        return this.features.evaluate({ userId, planId, feature, billingPeriodKey: null });
      }),
    );
  }
}
