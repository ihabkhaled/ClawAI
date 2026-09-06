import { Injectable, Logger } from '@nestjs/common';
import {
  type AdminUserPlanAssignment,
  type AdminUserPlanOverview,
  type AdminUserPlanSummary,
  type AdminUserTrial,
  AdminUserTrialState,
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
      trial: redemption === null ? null : AdminUserPlanService.toTrial(redemption, assignment, now),
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
  //
  // `state` needs the ASSIGNMENT as well, because the redemption row cannot
  // answer on its own. It is written once per user and outlives the assignment
  // that created it, so a trial that was replaced by a paid or admin grant goes
  // on counting down on paper. Reporting that countdown is what made an
  // admin-granted Pro account read "Free trial — 23 days left" beside a grant
  // valid until 2027.
  //
  // The test is identity, not plan slug or grant type: the redemption names the
  // exact assignment that granted it, so if the assignment in force is a
  // different row, something replaced the trial — no matter what it was, and
  // without this code needing to enumerate what may replace a trial.
  private static toTrial(
    redemption: PlanTrialRedemption,
    assignment: UserPlanAssignment | null,
    now: Date,
  ): AdminUserTrial {
    const hasExpired = redemption.expiresAt.getTime() <= now.getTime();

    return {
      startedAt: redemption.startedAt.toISOString(),
      expiresAt: redemption.expiresAt.toISOString(),
      daysRemaining: resolveTrialDaysRemaining(redemption.expiresAt, now),
      isExpired: hasExpired,
      state: AdminUserPlanService.toTrialState(redemption, assignment, hasExpired),
    };
  }

  // SUPERSEDED wins over EXPIRED when both are true. A trial that was replaced
  // and would later have run out is superseded: calling it expired invites the
  // reading that the user lost something on that date, when the replacement is
  // what they actually hold.
  //
  // No assignment at all is EXPIRED, not SUPERSEDED. Nothing replaced the trial
  // there — the account simply has no grant — and SUPERSEDED would assert a
  // replacement that does not exist.
  private static toTrialState(
    redemption: PlanTrialRedemption,
    assignment: UserPlanAssignment | null,
    hasExpired: boolean,
  ): AdminUserTrialState {
    if (assignment === null) {
      return AdminUserTrialState.EXPIRED;
    }
    if (assignment.id !== redemption.assignmentId) {
      return AdminUserTrialState.SUPERSEDED;
    }
    return hasExpired ? AdminUserTrialState.EXPIRED : AdminUserTrialState.ACTIVE;
  }
}
