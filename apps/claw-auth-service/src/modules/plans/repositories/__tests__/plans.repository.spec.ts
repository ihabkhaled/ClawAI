import { PlanModelAccessMode } from '../../../../generated/prisma';
import { type PrismaService } from '../../../../infrastructure/database/prisma/prisma.service';
import { PlansRepository } from '../plans.repository';

describe('PlansRepository model-access policy', () => {
  const plan = { id: 'plan-1', modelAccess: [] };
  const planUpdate = jest.fn();
  const accessDeleteMany = jest.fn();
  const accessCreateMany = jest.fn();
  const findUnique = jest.fn();
  const transaction = jest.fn();

  const prisma = {
    plan: { update: planUpdate, findUnique },
    planModelAccess: {
      deleteMany: accessDeleteMany,
      createMany: accessCreateMany,
    },
    $transaction: transaction,
  } as unknown as PrismaService;

  beforeEach(() => {
    jest.clearAllMocks();
    planUpdate.mockReturnValue(Promise.resolve(plan));
    accessDeleteMany.mockReturnValue(Promise.resolve({ count: 0 }));
    accessCreateMany.mockReturnValue(Promise.resolve({ count: 1 }));
    transaction.mockResolvedValue([]);
    findUnique.mockResolvedValue(plan);
  });

  it('switches a customized plan to an explicit allow-list atomically', async () => {
    const repository = new PlansRepository(prisma);

    await repository.replaceModelAccess('plan-1', [
      {
        provider: 'OPENAI',
        model: 'gpt-4o',
        isAllowed: true,
        allowAsPrimary: true,
        allowAsFallback: true,
        allowAsJudge: true,
        allowInCompare: true,
      },
    ]);

    expect(planUpdate).toHaveBeenCalledWith({
      where: { id: 'plan-1' },
      data: { modelAccessMode: PlanModelAccessMode.ALLOW_LIST },
    });
    expect(accessCreateMany).toHaveBeenCalled();
    expect(transaction).toHaveBeenCalledTimes(1);
  });

  it('switches an empty customized plan to deny-all without an empty createMany', async () => {
    const repository = new PlansRepository(prisma);

    await repository.replaceModelAccess('plan-1', []);

    expect(planUpdate).toHaveBeenCalledWith({
      where: { id: 'plan-1' },
      data: { modelAccessMode: PlanModelAccessMode.DENY_ALL },
    });
    expect(accessCreateMany).not.toHaveBeenCalled();
    expect(transaction).toHaveBeenCalledTimes(1);
  });
});

describe('PlansRepository retirement', () => {
  it('excludes retired tombstones from the normal admin list', async () => {
    const findMany = jest.fn().mockResolvedValue([]);
    const prisma = { plan: { findMany } } as unknown as PrismaService;
    await new PlansRepository(prisma).findAll();
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { lifecycleStatus: 'ACTIVE' } }),
    );
  });

  it('tombstones a plan and preserves paid assignment provenance', async () => {
    const planUpdateMany = jest.fn().mockResolvedValue({ count: 1 });
    const assignment = {
      id: 'assignment-old',
      userId: 'user-1',
      assignedByUserId: null,
      grantType: 'PAID_SUBSCRIPTION',
      grantReason: null,
      entitlementValidUntil: new Date('2026-09-01T00:00:00.000Z'),
      sourceSubscriptionId: 'subscription-1',
      sourceEventId: 'event-1',
    };
    const tx = {
      plan: { updateMany: planUpdateMany },
      planRetirementMigration: { create: jest.fn(), count: jest.fn() },
      userPlanAssignment: {
        findMany: jest.fn().mockResolvedValue([assignment]),
        update: jest.fn(),
        create: jest.fn().mockResolvedValue({ id: 'assignment-new' }),
      },
      user: { update: jest.fn() },
    };
    const prisma = {
      $transaction: jest.fn(async (callback: (client: typeof tx) => Promise<unknown>) =>
        callback(tx),
      ),
    } as unknown as PrismaService;

    const result = await new PlansRepository(prisma).retirePlan('plan-old', 'plan-upper');

    expect(planUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'plan-old', lifecycleStatus: 'ACTIVE' },
        data: expect.objectContaining({ isActive: false, isPublic: false }),
      }),
    );
    expect(tx.userPlanAssignment.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        planId: 'plan-upper',
        sourceSubscriptionId: 'subscription-1',
        entitlementValidUntil: assignment.entitlementValidUntil,
      }),
    });
    expect(tx.planRetirementMigration.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ status: 'BILLING_SCHEDULE_PENDING' }),
    });
    expect(result).toMatchObject({ migratedAssignments: 1, billingPending: 1 });
  });

  it('replays the persisted replacement on an idempotent second removal', async () => {
    const tx = {
      plan: {
        updateMany: jest.fn().mockResolvedValue({ count: 0 }),
        findUnique: jest.fn().mockResolvedValue({ replacementPlanId: 'plan-persisted' }),
      },
      planRetirementMigration: {
        count: jest.fn().mockResolvedValueOnce(2).mockResolvedValueOnce(1),
      },
    };
    const prisma = {
      $transaction: jest.fn(async (callback: (client: typeof tx) => Promise<unknown>) =>
        callback(tx),
      ),
    } as unknown as PrismaService;
    const result = await new PlansRepository(prisma).retirePlan('plan-old', 'plan-new-request');
    expect(result.replacementPlanId).toBe('plan-persisted');
    expect(result.alreadyRetired).toBe(true);
  });

  it('derives the pending replacement slug from the auth plan table', async () => {
    const prisma = {
      planRetirementMigration: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'migration-1',
            userId: 'user-1',
            sourcePlanId: 'plan-old',
            replacementPlanId: 'plan-pro',
            sourceSubscriptionId: 'subscription-1',
          },
        ]),
      },
      plan: {
        findMany: jest.fn().mockResolvedValue([{ id: 'plan-pro', slug: 'pro' }]),
      },
    } as unknown as PrismaService;
    const result = await new PlansRepository(prisma).listPendingRetirementMigrations(10);
    expect(result[0]).toMatchObject({ replacementPlanId: 'plan-pro', replacementPlanSlug: 'pro' });
  });
});
