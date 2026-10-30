import { Injectable } from '@nestjs/common';

import { PlansRepository } from '../../plans/repositories/plans.repository';
import { toSafeBalanceNumber } from '../utilities/credit-bucket.utility';
import type { PlanCallLimits } from '../types/plan-call-limits.types';

/**
 * The per-call limits of the plan a user is on right now (ADR-197).
 *
 * Same plan selection as the free allowance: the effective plan, else the default
 * one. A user with no plan at all has no limits to apply, which is the behaviour
 * before the limits existed, not a new way to be unmetered.
 */
@Injectable()
export class PlanCallLimitService {
  constructor(private readonly plans: PlansRepository) {}

  async resolve(userId: string): Promise<PlanCallLimits | null> {
    const plan =
      (await this.plans.findEffectiveForUser(userId, new Date())) ??
      (await this.plans.findDefault());
    if (plan === null) {
      return null;
    }
    return {
      maxInputTokens: plan.maxInputTokensPerCall,
      maxOutputTokens: plan.maxOutputTokensPerCall,
      maxCostMicroUsd:
        plan.maxCostPerCallMicroUsd === null
          ? null
          : toSafeBalanceNumber(plan.maxCostPerCallMicroUsd),
    };
  }
}
