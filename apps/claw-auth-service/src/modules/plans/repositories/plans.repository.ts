import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import { Prisma } from '../../../generated/prisma';
import { type PlanWithAccess } from '../types/plans.types';

@Injectable()
export class PlansRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(): Promise<PlanWithAccess[]> {
    return this.prisma.plan.findMany({
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
    await this.prisma.$transaction([
      this.prisma.planModelAccess.deleteMany({ where: { planId } }),
      this.prisma.planModelAccess.createMany({
        data: rows.map((r) => ({ ...r, planId })),
        skipDuplicates: true,
      }),
    ]);
    return this.findById(planId) as Promise<PlanWithAccess>;
  }

  // Atomically: expire the user's prior ACTIVE assignment, create a new ACTIVE
  // one, and point User.activePlanId at the new plan.
  async assignUserToPlan(userId: string, planId: string, assignedByUserId?: string): Promise<void> {
    await this.prisma.$transaction([
      this.prisma.userPlanAssignment.updateMany({
        where: { userId, status: 'ACTIVE' },
        data: { status: 'EXPIRED', endsAt: new Date() },
      }),
      this.prisma.userPlanAssignment.create({
        data: { userId, planId, status: 'ACTIVE', assignedByUserId },
      }),
      this.prisma.user.update({ where: { id: userId }, data: { activePlanId: planId } }),
    ]);
  }

  async listUserIdsOnPlan(planId: string): Promise<string[]> {
    const rows = await this.prisma.user.findMany({
      where: { activePlanId: planId },
      select: { id: true },
    });
    return rows.map((r) => r.id);
  }
}
