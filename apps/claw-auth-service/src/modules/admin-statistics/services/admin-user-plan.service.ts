import { Injectable, Logger } from '@nestjs/common';
import {
  type AdminUserPlanAssignment,
  type AdminUserPlanOverview,
  type AdminUserPlanSummary,
  type AdminUserTrial,
} from '@claw/shared-types';

import {
  type Plan,
  type PlanTrialRedemption,
  type UserPlanAssignment,
} from '../../../generated/prisma';
import { PlansRepository } from '../../plans/repositories/plans.repository';
import { resolveTrialDaysRemaining } from '../utilities/trial-days-remaining.utility';

/**
 * The auth-owned half of the admin subscription modal: which plan a user is
 * on, how they got it, and where their free trial stands.
 *
 * The payment-owned half — the subscription itself, its billing period, its
 * invoices — is served by payment-service. Neither service reads the other's
 * tables, so the modal fetches both and renders them side by side rather than
 * one becoming a stale mirror of the other.
 */
@Injectable()
export class AdminUserPlanService {
  private readonly logger = new Logger(AdminUserPlanService.name);

  constructor(private readonly plans: PlansRepository) {}

  async getPlanOverview(userId: string): Promise<AdminUserPlanOverview> {
    this.logger.debug(`getPlanOverview: ${userId}`);
    const now = new Date();

    const [assignment, redemption] = await Promise.all([
      this.plans.findLatestAssignmentForUser(userId),
      this.plans.findTrialRedemption(userId),
    ]);

    const plan = assignment === null ? null : await this.plans.findById(assignment.planId);

    return {
      userId,
      generatedAt: now.toISOString(),
      plan: plan === null ? null : AdminUserPlanService.toPlanSummary(plan),
      assignment: assignment === null ? null : AdminUserPlanService.toAssignment(assignment),
      trial: redemption === null ? null : AdminUserPlanService.toTrial(redemption, now),
    };
  }

  private static toPlanSummary(plan: Plan): AdminUserPlanSummary {
    return {
      id: plan.id,
      slug: plan.slug,
      name: plan.name,
      isTrial: plan.isTrial,
      trialDurationDays: plan.trialDurationDays,
    };
  }

  private static toAssignment(assignment: UserPlanAssignment): AdminUserPlanAssignment {
    return {
      status: assignment.status,
      grantType: assignment.grantType,
      grantReason: assignment.grantReason,
      startsAt: assignment.startsAt.toISOString(),
      endsAt: assignment.endsAt?.toISOString() ?? null,
      entitlementValidUntil: assignment.entitlementValidUntil?.toISOString() ?? null,
      sourceSubscriptionId: assignment.sourceSubscriptionId,
    };
  }

  // `isExpired` is derived from the same instant `daysRemaining` is, so the two
  // can never disagree. Deriving them from separate `new Date()` calls is how a
  // panel ends up reporting "0 days remaining" beside "active".
  private static toTrial(redemption: PlanTrialRedemption, now: Date): AdminUserTrial {
    return {
      startedAt: redemption.startedAt.toISOString(),
      expiresAt: redemption.expiresAt.toISOString(),
      daysRemaining: resolveTrialDaysRemaining(redemption.expiresAt, now),
      isExpired: redemption.expiresAt.getTime() <= now.getTime(),
    };
  }
}
