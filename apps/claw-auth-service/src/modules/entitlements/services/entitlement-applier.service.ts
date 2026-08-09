import { Injectable, Logger } from '@nestjs/common';

import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import { EntitlementGrantType, PlanAssignmentStatus } from '../../../generated/prisma';
import {
  ENTITLEMENT_GRANTING_PATTERNS,
  ENTITLEMENT_REVOKING_PATTERNS,
  FREE_PLAN_SLUG,
} from '../constants/entitlement-inbox.constants';
import { type ApplyEntitlementInput } from '../types/entitlement-inbox.types';

// Applies a verified billing event to the user's plan.
//
// The whole change — assignment row, active-plan pointer, entitlement window —
// happens in one transaction, so a user is never left pointing at a plan whose
// assignment failed to write.
//
// Grant provenance is PAID_SUBSCRIPTION and the source event id is recorded, so
// a paid entitlement remains permanently distinguishable from an admin grant in
// every downstream report.
@Injectable()
export class EntitlementApplierService {
  private readonly logger = new Logger(EntitlementApplierService.name);

  constructor(private readonly prisma: PrismaService) {}

  // Returns false when the event is older than what has already been applied.
  async apply(input: ApplyEntitlementInput): Promise<boolean> {
    if (ENTITLEMENT_REVOKING_PATTERNS.includes(input.pattern)) {
      return this.revoke(input);
    }
    if (!ENTITLEMENT_GRANTING_PATTERNS.includes(input.pattern)) {
      this.logger.warn(`apply: no entitlement effect for pattern ${input.pattern}`);
      return false;
    }
    return this.grant(input);
  }

  private async grant(input: ApplyEntitlementInput): Promise<boolean> {
    if (input.planId === null) {
      this.logger.error(`grant: ${input.pattern} carried no planId — refusing`);
      return false;
    }
    const current = await this.prisma.userPlanAssignment.findFirst({
      where: { userId: input.userId, status: PlanAssignmentStatus.ACTIVE },
      orderBy: { startsAt: 'desc' },
    });
    // Out-of-order delivery: an older event must never overwrite newer state.
    if (current && current.startsAt.getTime() > input.effectiveAtMs) {
      return false;
    }

    const planId = input.planId;
    await this.prisma.$transaction(async (tx) => {
      if (current) {
        await tx.userPlanAssignment.update({
          where: { id: current.id },
          data: { status: PlanAssignmentStatus.EXPIRED, endsAt: new Date(input.effectiveAtMs) },
        });
      }
      await tx.userPlanAssignment.create({
        data: {
          userId: input.userId,
          planId,
          status: PlanAssignmentStatus.ACTIVE,
          // Provenance is what keeps a paid entitlement distinguishable from an
          // admin grant forever.
          grantType: EntitlementGrantType.PAID_SUBSCRIPTION,
          entitlementValidUntil: new Date(input.entitlementValidUntilMs),
          sourceSubscriptionId: input.subscriptionId,
          sourceEventId: input.sourceEventId,
          startsAt: new Date(input.effectiveAtMs),
        },
      });
      await tx.user.update({
        where: { id: input.userId },
        data: { activePlanId: planId },
      });
    });
    this.logger.log(`grant: user=${input.userId} plan=${planId}`);
    return true;
  }

  private async revoke(input: ApplyEntitlementInput): Promise<boolean> {
    const freePlan = await this.prisma.plan.findUnique({ where: { slug: FREE_PLAN_SLUG } });
    if (!freePlan) {
      this.logger.error('revoke: no free plan configured — cannot downgrade safely');
      return false;
    }
    const current = await this.prisma.userPlanAssignment.findFirst({
      where: { userId: input.userId, status: PlanAssignmentStatus.ACTIVE },
      orderBy: { startsAt: 'desc' },
    });
    if (current && current.startsAt.getTime() > input.effectiveAtMs) {
      return false;
    }

    const trialStartedAt = new Date();
    const newTrialExpiresAt = new Date(trialStartedAt.getTime() + 30 * 24 * 60 * 60 * 1000);

    await this.prisma.$transaction(async (tx) => {
      if (current) {
        await tx.userPlanAssignment.update({
          where: { id: current.id },
          data: {
            status: PlanAssignmentStatus.CANCELLED,
            endsAt: new Date(input.effectiveAtMs),
          },
        });
      }
      const redemption = await tx.planTrialRedemption.findUnique({
        where: { userId: input.userId },
        select: { expiresAt: true },
      });
      const entitlementValidUntil = redemption?.expiresAt ?? newTrialExpiresAt;
      const assignment = await tx.userPlanAssignment.create({
        data: {
          userId: input.userId,
          planId: freePlan.id,
          status: PlanAssignmentStatus.ACTIVE,
          grantType: EntitlementGrantType.FREE_DEFAULT,
          grantReason: `Revoked by ${input.pattern}`,
          sourceEventId: input.sourceEventId,
          startsAt: new Date(input.effectiveAtMs),
          entitlementValidUntil,
        },
      });
      if (redemption === null) {
        await tx.planTrialRedemption.create({
          data: {
            userId: input.userId,
            planId: freePlan.id,
            assignmentId: assignment.id,
            startedAt: trialStartedAt,
            expiresAt: newTrialExpiresAt,
          },
        });
      }
      await tx.user.update({
        where: { id: input.userId },
        data: { activePlanId: freePlan.id },
      });
    });
    this.logger.warn(`revoke: user=${input.userId} downgraded to free by ${input.pattern}`);
    return true;
  }
}
