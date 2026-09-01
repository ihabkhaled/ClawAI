import { Injectable } from '@nestjs/common';
import { addCalendarMonths } from '@claw/shared-utilities';
import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import { POPULAR_PLAN_KEY } from '../constants/popular-plan.constants';
import {
  PlanModelAccessMode,
  type PlanRetirementMigrationStatus,
  Prisma,
  type UserPlanAssignment,
} from '../../../generated/prisma';
import {
  type ActiveTrialState,
  type PendingPlanRetirementMigration,
  type PlanRetirementResult,
  type PlanWithAccess,
} from '../types/plans.types';

@Injectable()
export class PlansRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(): Promise<PlanWithAccess[]> {
    return this.prisma.plan.findMany({
      where: { lifecycleStatus: 'ACTIVE' },
      include: { modelAccess: true },
      orderBy: { displayOrder: 'asc' },
    });
  }

  async findById(id: string): Promise<PlanWithAccess | null> {
    return this.prisma.plan.findUnique({ where: { id }, include: { modelAccess: true } });
  }

  async findBySlug(slug: string): Promise<PlanWithAccess | null> {
    return this.prisma.plan.findUnique({ where: { slug }, include: { modelAccess: true } });
  }

  async findDefault(): Promise<PlanWithAccess | null> {
    return this.prisma.plan.findFirst({
      where: { isDefault: true, isActive: true },
      include: { modelAccess: true },
    });
  }

  async findEffectiveForUser(userId: string, now: Date): Promise<PlanWithAccess | null> {
    const assignment = await this.prisma.userPlanAssignment.findFirst({
      where: {
        userId,
        status: 'ACTIVE',
        OR: [{ entitlementValidUntil: null }, { entitlementValidUntil: { gt: now } }],
      },
      orderBy: { startsAt: 'desc' },
      include: { plan: { include: { modelAccess: true } } },
    });
    return assignment?.plan ?? null;
  }

  async findActiveTrialState(userId: string): Promise<ActiveTrialState | null> {
    const assignment = await this.prisma.userPlanAssignment.findFirst({
      where: { userId, status: 'ACTIVE' },
      select: { entitlementValidUntil: true, plan: { select: { isTrial: true } } },
      orderBy: { startsAt: 'desc' },
    });
    return assignment === null
      ? null
      : { isTrial: assignment.plan.isTrial, expiresAt: assignment.entitlementValidUntil };
  }

  async create(data: Prisma.PlanCreateInput): Promise<PlanWithAccess> {
    const plan = await this.prisma.plan.create({ data });
    return this.findById(plan.id) as Promise<PlanWithAccess>;
  }

  async update(id: string, data: Prisma.PlanUpdateInput): Promise<PlanWithAccess> {
    await this.prisma.plan.update({ where: { id }, data });
    return this.findById(id) as Promise<PlanWithAccess>;
  }

  async setActive(id: string, isActive: boolean): Promise<void> {
    await this.prisma.plan.update({ where: { id }, data: { isActive } });
  }

  // Clears the default flag on all plans except `keepId` then sets it on keepId,
  // atomically — enforces the "exactly one default" invariant.
  async makeDefault(keepId: string): Promise<void> {
    await this.prisma.$transaction([
      this.prisma.plan.updateMany({ where: { id: { not: keepId } }, data: { isDefault: false } }),
      this.prisma.plan.update({ where: { id: keepId }, data: { isDefault: true, isActive: true } }),
    ]);
  }

  /**
   * Moves the "Most popular" badge to one plan.
   *
   * Clearing `popularKey` on every other row first is what makes the unique
   * index usable: without it, granting the badge to a second plan would collide
   * with the literal 'popular' the first one still holds. Doing both inside one
   * transaction is what stops two administrators racing to a state where the
   * badge is on nobody.
   *
   * A retired or inactive plan is not force-activated here, unlike makeDefault:
   * badging a plan is a marketing statement, not a decision that anybody is
   * about to be subscribed to it.
   */
  async makePopular(keepId: string): Promise<void> {
    await this.prisma.$transaction([
      this.prisma.plan.updateMany({
        where: { id: { not: keepId } },
        data: { isPopular: false, popularKey: null },
      }),
      this.prisma.plan.update({
        where: { id: keepId },
        data: { isPopular: true, popularKey: POPULAR_PLAN_KEY },
      }),
    ]);
  }

  /** Removes the badge entirely, leaving the pricing page with none. */
  async clearPopular(): Promise<void> {
    await this.prisma.plan.updateMany({
      where: { isPopular: true },
      data: { isPopular: false, popularKey: null },
    });
  }

  async reorder(orderedIds: string[]): Promise<void> {
    await this.prisma.$transaction(
      orderedIds.map((id, index) =>
        this.prisma.plan.update({ where: { id }, data: { displayOrder: index } }),
      ),
    );
  }

  async countActiveAssignments(planId: string): Promise<number> {
    return this.prisma.userPlanAssignment.count({ where: { planId, status: 'ACTIVE' } });
  }

  async replaceModelAccess(
    planId: string,
    rows: Array<Omit<Prisma.PlanModelAccessCreateManyInput, 'planId'>>,
  ): Promise<PlanWithAccess> {
    const mode = rows.length === 0 ? PlanModelAccessMode.DENY_ALL : PlanModelAccessMode.ALLOW_LIST;
    const operations = [
      this.prisma.plan.update({ where: { id: planId }, data: { modelAccessMode: mode } }),
      this.prisma.planModelAccess.deleteMany({ where: { planId } }),
    ];
    if (rows.length > 0) {
      operations.push(
        this.prisma.planModelAccess.createMany({
          data: rows.map((row) => ({ ...row, planId })),
          skipDuplicates: true,
        }),
      );
    }
    await this.prisma.$transaction(operations);
    return this.findById(planId) as Promise<PlanWithAccess>;
  }

  // Atomically: expire the user's prior ACTIVE assignment, create a new ACTIVE
  // one, and point User.activePlanId at the new plan.
  /**
   * Reads the two facts the super-administrator target rule needs.
   *
   * Read here rather than through UsersService because UsersModule already
   * imports PlansModule (an administrator-created account needs the signup
   * plan), so the reverse dependency would be a cycle. Same service, same
   * database, so this stays inside the ownership boundary.
   */
  async findUserMutabilityFacts(
    userId: string,
  ): Promise<{ id: string; isSuperAdmin: boolean } | null> {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, isSuperAdmin: true },
    });
  }

  /**
   * Assigns the platform's default (signup) plan — no admin actor, no reason,
   * never expires. Preserves `assignUserToPlan`'s old, unattributed behavior
   * byte-for-byte, kept as its own method now that `assignUserToPlan` is
   * exclusively the attributed, time-limited admin-grant path: an automatic
   * signup grant is not an administrator's discretionary action and must not
   * be mislabeled `ADMIN_GRANT` or forced to expire on a clock. Called by
   * `AuthManager.register` and `UsersService.assignSignupPlan`.
   */
  async assignDefaultPlan(userId: string, planId: string): Promise<void> {
    await this.prisma.$transaction([
      this.prisma.userPlanAssignment.updateMany({
        where: { userId, status: 'ACTIVE' },
        data: { status: 'EXPIRED', endsAt: new Date() },
      }),
      this.prisma.userPlanAssignment.create({
        data: { userId, planId, status: 'ACTIVE', assignedByUserId: undefined },
      }),
      this.prisma.user.update({ where: { id: userId }, data: { activePlanId: planId } }),
    ]);
  }

  async assignUserToPlan(
    userId: string,
    planId: string,
    assignedByUserId: string | undefined,
    durationMonths: number,
    grantReason: string,
    now: Date,
  ): Promise<void> {
    const entitlementValidUntil = new Date(addCalendarMonths(now.getTime(), durationMonths));
    await this.prisma.$transaction([
      this.prisma.userPlanAssignment.updateMany({
        where: { userId, status: 'ACTIVE' },
        data: { status: 'EXPIRED', endsAt: now },
      }),
      this.prisma.userPlanAssignment.create({
        data: {
          userId,
          planId,
          status: 'ACTIVE',
          assignedByUserId,
          grantType: 'ADMIN_GRANT',
          grantReason,
          entitlementValidUntil,
        },
      }),
      this.prisma.user.update({ where: { id: userId }, data: { activePlanId: planId } }),
    ]);
  }

  async assignTrialPlanOnce(
    userId: string,
    planId: string,
    assignedByUserId: string | undefined,
    now: Date,
  ): Promise<UserPlanAssignment | null> {
    try {
      return await this.prisma.$transaction(async (tx) => {
        const trialPlan = await tx.plan.findFirst({
          where: { id: planId, isActive: true, isTrial: true, trialDurationDays: 30 },
          select: { id: true },
        });
        if (trialPlan === null) {
          return null;
        }
        const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
        await tx.userPlanAssignment.updateMany({
          where: { userId, status: 'ACTIVE' },
          data: { status: 'EXPIRED', endsAt: now },
        });
        const assignment = await tx.userPlanAssignment.create({
          data: {
            userId,
            planId,
            status: 'ACTIVE',
            assignedByUserId,
            startsAt: now,
            entitlementValidUntil: expiresAt,
          },
        });
        await tx.planTrialRedemption.create({
          data: { userId, planId, assignmentId: assignment.id, startedAt: now, expiresAt },
        });
        await tx.user.update({ where: { id: userId }, data: { activePlanId: planId } });
        return assignment;
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002' &&
        Array.isArray(error.meta?.target) &&
        error.meta.target.includes('user_id')
      ) {
        return null;
      }
      return Promise.reject(error);
    }
  }

  async listUserIdsOnPlan(planId: string): Promise<string[]> {
    const rows = await this.prisma.user.findMany({
      where: { activePlanId: planId },
      select: { id: true },
    });
    return rows.map((r) => r.id);
  }

  async findRetirementReplacement(sourcePlanId: string): Promise<PlanWithAccess | null> {
    const source = await this.prisma.plan.findUnique({ where: { id: sourcePlanId } });
    if (!source) return null;
    return this.prisma.plan.findFirst({
      where: {
        id: { not: sourcePlanId },
        lifecycleStatus: 'ACTIVE',
        isActive: true,
        displayOrder: { gt: source.displayOrder },
      },
      include: { modelAccess: true },
      orderBy: [{ displayOrder: 'asc' }, { id: 'asc' }],
    });
  }

  async retirePlan(sourcePlanId: string, replacementPlanId: string): Promise<PlanRetirementResult> {
    return this.prisma.$transaction(async (tx) => {
      const retiredAt = new Date();
      const transition = await tx.plan.updateMany({
        where: { id: sourcePlanId, lifecycleStatus: 'ACTIVE' },
        data: {
          lifecycleStatus: 'RETIRED',
          replacementPlanId,
          retiredAt,
          isActive: false,
          isPublic: false,
        },
      });
      if (transition.count === 0) {
        const persisted = await tx.plan.findUnique({
          where: { id: sourcePlanId },
          select: { replacementPlanId: true },
        });
        const persistedReplacementId = persisted?.replacementPlanId ?? replacementPlanId;
        const existing = await tx.planRetirementMigration.count({ where: { sourcePlanId } });
        const pending = await tx.planRetirementMigration.count({
          where: { sourcePlanId, status: 'BILLING_SCHEDULE_PENDING' },
        });
        return {
          sourcePlanId,
          replacementPlanId: persistedReplacementId,
          migratedAssignments: existing,
          billingPending: pending,
          alreadyRetired: true,
        };
      }
      const assignments = await tx.userPlanAssignment.findMany({
        where: { planId: sourcePlanId, status: 'ACTIVE' },
      });
      let billingPending = 0;
      for (const assignment of assignments) {
        await tx.userPlanAssignment.update({
          where: { id: assignment.id },
          data: { status: 'EXPIRED', endsAt: retiredAt },
        });
        const replacement = await tx.userPlanAssignment.create({
          data: {
            userId: assignment.userId,
            planId: replacementPlanId,
            status: 'ACTIVE',
            assignedByUserId: assignment.assignedByUserId,
            grantType: assignment.grantType,
            grantReason: assignment.grantReason,
            entitlementValidUntil: assignment.entitlementValidUntil,
            sourceSubscriptionId: assignment.sourceSubscriptionId,
            sourceEventId: assignment.sourceEventId,
            startsAt: retiredAt,
          },
        });
        const paid = assignment.sourceSubscriptionId !== null;
        if (paid) billingPending += 1;
        await tx.planRetirementMigration.create({
          data: {
            sourceAssignmentId: assignment.id,
            replacementAssignmentId: replacement.id,
            userId: assignment.userId,
            sourcePlanId,
            replacementPlanId,
            sourceSubscriptionId: assignment.sourceSubscriptionId,
            status: paid ? 'BILLING_SCHEDULE_PENDING' : 'APPLIED',
          },
        });
        // Super-administrator exemption, deliberate: retiring a plan is a
        // system-driven migration, not an administrator acting on a row. See
        // rules/35-super-administrator-and-privilege-boundaries.md rule 8.
        await tx.user.update({
          where: { id: assignment.userId },
          data: { activePlanId: replacementPlanId },
        });
      }
      return {
        sourcePlanId,
        replacementPlanId,
        migratedAssignments: assignments.length,
        billingPending,
        alreadyRetired: false,
      };
    });
  }

  async listPendingRetirementMigrations(limit: number): Promise<PendingPlanRetirementMigration[]> {
    const rows = await this.prisma.planRetirementMigration.findMany({
      where: { status: 'BILLING_SCHEDULE_PENDING', sourceSubscriptionId: { not: null } },
      orderBy: { createdAt: 'asc' },
      take: limit,
    });
    const replacementIds = [...new Set(rows.map((row) => row.replacementPlanId))];
    const replacements = await this.prisma.plan.findMany({
      where: { id: { in: replacementIds } },
      select: { id: true, slug: true },
    });
    const slugs = new Map(replacements.map((plan) => [plan.id, plan.slug]));
    return rows.flatMap((row) =>
      row.sourceSubscriptionId === null || !slugs.has(row.replacementPlanId)
        ? []
        : [
            {
              id: row.id,
              userId: row.userId,
              sourcePlanId: row.sourcePlanId,
              replacementPlanId: row.replacementPlanId,
              replacementPlanSlug: slugs.get(row.replacementPlanId) ?? '',
              sourceSubscriptionId: row.sourceSubscriptionId,
            },
          ],
    );
  }

  async recordRetirementMigrationOutcome(
    id: string,
    status: PlanRetirementMigrationStatus,
    errorCode?: string,
  ): Promise<boolean> {
    const result = await this.prisma.planRetirementMigration.updateMany({
      where: { id, status: 'BILLING_SCHEDULE_PENDING' },
      data: { status, errorCode: errorCode ?? null },
    });
    return result.count === 1;
  }
}
