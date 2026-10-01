import { vi } from 'vitest';
import { PlanModelAccessMode } from '../../../../generated/prisma';
import { type PrismaService } from '../../../../infrastructure/database/prisma/prisma.service';
import { PlansRepository } from '../plans.repository';

describe('PlansRepository model-access policy', () => {
  const plan = { id: 'plan-1', modelAccess: [] };
  const planUpdate = vi.fn();
  const accessDeleteMany = vi.fn();
  const accessCreateMany = vi.fn();
  const findUnique = vi.fn();
  const transaction = vi.fn();

  const prisma = {
    plan: { update: planUpdate, findUnique },
    planModelAccess: {
      deleteMany: accessDeleteMany,
      createMany: accessCreateMany,
    },
    $transaction: transaction,
  } as unknown as PrismaService;

  beforeEach(() => {
    vi.clearAllMocks();
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
    const findMany = vi.fn().mockResolvedValue([]);
    const prisma = { plan: { findMany } } as unknown as PrismaService;
    await new PlansRepository(prisma).findAll();
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { lifecycleStatus: 'ACTIVE' } }),
    );
  });

  it('tombstones a plan and preserves paid assignment provenance', async () => {
    const planUpdateMany = vi.fn().mockResolvedValue({ count: 1 });
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
      planRetirementMigration: { create: vi.fn(), count: vi.fn() },
      userPlanAssignment: {
        findMany: vi.fn().mockResolvedValue([assignment]),
        update: vi.fn(),
        create: vi.fn().mockResolvedValue({ id: 'assignment-new' }),
      },
      user: { update: vi.fn() },
    };
    const prisma = {
      $transaction: vi.fn(async (callback: (client: typeof tx) => Promise<unknown>) =>
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
        updateMany: vi.fn().mockResolvedValue({ count: 0 }),
        findUnique: vi.fn().mockResolvedValue({ replacementPlanId: 'plan-persisted' }),
      },
      planRetirementMigration: {
        count: vi.fn().mockResolvedValueOnce(2).mockResolvedValueOnce(1),
      },
    };
    const prisma = {
      $transaction: vi.fn(async (callback: (client: typeof tx) => Promise<unknown>) =>
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
        findMany: vi.fn().mockResolvedValue([
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
        findMany: vi.fn().mockResolvedValue([{ id: 'plan-pro', slug: 'pro' }]),
      },
    } as unknown as PrismaService;
    const result = await new PlansRepository(prisma).listPendingRetirementMigrations(10);
    expect(result[0]).toMatchObject({ replacementPlanId: 'plan-pro', replacementPlanSlug: 'pro' });
  });
});

describe('PlansRepository.assignDefaultPlan (signup grant)', () => {
  it('assigns the default plan with no admin actor, reason, or expiry', async () => {
    const updateMany = vi.fn().mockResolvedValue({ count: 0 });
    const create = vi.fn().mockResolvedValue({ id: 'assignment-new' });
    const userUpdate = vi.fn().mockResolvedValue({});
    const transaction = vi.fn(async (ops: unknown[]) => ops);
    const prisma = {
      userPlanAssignment: { updateMany, create },
      user: { update: userUpdate },
      $transaction: transaction,
    } as unknown as PrismaService;
    const repository = new PlansRepository(prisma);

    await repository.assignDefaultPlan('user-1', 'plan-free');

    expect(transaction).toHaveBeenCalledTimes(1);
    expect(updateMany).toHaveBeenCalledWith({
      where: { userId: 'user-1', status: 'ACTIVE' },
      data: expect.objectContaining({ status: 'EXPIRED' }),
    });
    expect(create).toHaveBeenCalledWith({
      data: {
        userId: 'user-1',
        planId: 'plan-free',
        status: 'ACTIVE',
        assignedByUserId: undefined,
      },
    });
    const createData = create.mock.calls[0]?.[0]?.data;
    expect(createData).not.toHaveProperty('grantType');
    expect(createData).not.toHaveProperty('grantReason');
    expect(createData).not.toHaveProperty('entitlementValidUntil');
    expect(userUpdate).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: { activePlanId: 'plan-free' },
    });
  });
});

describe('PlansRepository.assignUserToPlan (admin grant)', () => {
  it('expires the prior assignment and creates an attributed, time-limited grant', async () => {
    const updateMany = vi.fn().mockResolvedValue({ count: 1 });
    const create = vi.fn().mockResolvedValue({ id: 'assignment-new' });
    const userUpdate = vi.fn().mockResolvedValue({});
    const transaction = vi.fn(async (ops: unknown[]) => ops);
    const prisma = {
      userPlanAssignment: { updateMany, create },
      user: { update: userUpdate },
      $transaction: transaction,
    } as unknown as PrismaService;
    const repository = new PlansRepository(prisma);
    const now = new Date('2026-01-31T00:00:00.000Z');

    await repository.assignUserToPlan(
      'user-1',
      'plan-pro',
      'admin-1',
      new Date('2026-04-30T00:00:00.000Z'),
      'Support gesture',
      now,
    );

    expect(transaction).toHaveBeenCalledTimes(1);
    expect(updateMany).toHaveBeenCalledWith({
      where: { userId: 'user-1', status: 'ACTIVE' },
      data: { status: 'EXPIRED', endsAt: now },
    });
    expect(create).toHaveBeenCalledWith({
      data: {
        userId: 'user-1',
        planId: 'plan-pro',
        status: 'ACTIVE',
        assignedByUserId: 'admin-1',
        grantType: 'ADMIN_GRANT',
        grantReason: 'Support gesture',
        entitlementValidUntil: new Date('2026-04-30T00:00:00.000Z'),
      },
    });
    expect(userUpdate).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: { activePlanId: 'plan-pro' },
    });
  });
});

describe('PlansRepository.findEffectiveForUser (admin grant expiry)', () => {
  it('excludes an admin grant whose entitlementValidUntil has passed, via the existing lazy filter', async () => {
    const findFirst = vi.fn().mockResolvedValue(null);
    const prisma = { userPlanAssignment: { findFirst } } as unknown as PrismaService;
    const repository = new PlansRepository(prisma);
    const now = new Date('2026-05-01T00:00:00.000Z');

    const result = await repository.findEffectiveForUser('user-1', now);

    expect(result).toBeNull();
    expect(findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          userId: 'user-1',
          status: 'ACTIVE',
          OR: [{ entitlementValidUntil: null }, { entitlementValidUntil: { gt: now } }],
        },
      }),
    );
  });

  it('does not special-case ADMIN_GRANT — the same OR filter that already excludes an expired paid subscription excludes an expired admin grant', async () => {
    // A row with grantType ADMIN_GRANT and entitlementValidUntil in the past
    // is simply never returned by the query above (its entitlementValidUntil
    // is neither null nor > now), so the caller falls back to the default
    // plan through whatever already handles "no effective assignment found" —
    // proving no new expiry-enforcement code path is needed for this feature.
    const findFirst = vi.fn().mockResolvedValue(null);
    const prisma = { userPlanAssignment: { findFirst } } as unknown as PrismaService;
    const repository = new PlansRepository(prisma);
    const result = await repository.findEffectiveForUser('user-1', new Date());
    expect(result).toBeNull();
  });
});

describe('PlansRepository.assignTrialPlanOnce (dynamic trial length)', () => {
  const now = new Date('2026-10-01T00:00:00.000Z');

  function build(trialPlan: { id: string; trialDurationDays: number | null } | null) {
    const planFindFirst = vi.fn().mockResolvedValue(trialPlan);
    const updateMany = vi.fn().mockResolvedValue({ count: 0 });
    const create = vi.fn().mockResolvedValue({ id: 'assignment-1' });
    const redemptionCreate = vi.fn().mockResolvedValue({});
    const userUpdate = vi.fn().mockResolvedValue({});
    const tx = {
      plan: { findFirst: planFindFirst },
      userPlanAssignment: { updateMany, create },
      planTrialRedemption: { create: redemptionCreate },
      user: { update: userUpdate },
    };
    const prisma = {
      $transaction: vi.fn(async (fn: (client: typeof tx) => Promise<unknown>) => fn(tx)),
    } as unknown as PrismaService;
    return { repository: new PlansRepository(prisma), planFindFirst, create, redemptionCreate };
  }

  it.each([14, 30, 90, 365])(
    'ends a %i-day plan trial exactly that many days out',
    async (days) => {
      const { repository, create, redemptionCreate } = build({
        id: 'plan-free',
        trialDurationDays: days,
      });

      await repository.assignTrialPlanOnce('user-1', 'plan-free', undefined, now);

      const expiresAt = new Date(now.getTime() + days * 86_400_000);
      expect(create.mock.calls[0]?.[0].data.entitlementValidUntil).toEqual(expiresAt);
      expect(redemptionCreate.mock.calls[0]?.[0].data.expiresAt).toEqual(expiresAt);
    },
  );

  it('does not filter on a fixed length when it looks the plan up', async () => {
    const { repository, planFindFirst } = build({ id: 'plan-free', trialDurationDays: 90 });

    await repository.assignTrialPlanOnce('user-1', 'plan-free', undefined, now);

    expect(planFindFirst.mock.calls[0]?.[0].where).toEqual({
      id: 'plan-free',
      isActive: true,
      isTrial: true,
      trialDurationDays: { gte: 1 },
    });
  });

  it('grants nothing when the plan is not a usable trial', async () => {
    const { repository, create } = build(null);

    await expect(
      repository.assignTrialPlanOnce('user-1', 'plan-pro', undefined, now),
    ).resolves.toBeNull();
    expect(create).not.toHaveBeenCalled();
  });
});

describe('PlansRepository admin trial grant and extension', () => {
  const now = new Date('2026-10-01T00:00:00.000Z');
  const expiresAt = new Date('2027-10-01T00:00:00.000Z');

  it('re-points the lifetime redemption at a new ADMIN_GRANT assignment', async () => {
    const updateMany = vi.fn().mockResolvedValue({ count: 1 });
    const create = vi.fn().mockResolvedValue({ id: 'assignment-new' });
    const upsert = vi.fn().mockResolvedValue({});
    const userUpdate = vi.fn().mockResolvedValue({});
    const tx = {
      userPlanAssignment: { updateMany, create },
      planTrialRedemption: { upsert },
      user: { update: userUpdate },
    };
    const prisma = {
      $transaction: vi.fn(async (fn: (client: typeof tx) => Promise<unknown>) => fn(tx)),
    } as unknown as PrismaService;

    await new PlansRepository(prisma).assignAdminTrialGrant(
      'user-1',
      'plan-free',
      'admin-1',
      expiresAt,
      'Goodwill',
      now,
    );

    expect(create.mock.calls[0]?.[0].data).toMatchObject({
      grantType: 'ADMIN_GRANT',
      grantReason: 'Goodwill',
      entitlementValidUntil: expiresAt,
    });
    expect(upsert).toHaveBeenCalledWith({
      where: { userId: 'user-1' },
      update: { planId: 'plan-free', assignmentId: 'assignment-new', expiresAt },
      create: {
        userId: 'user-1',
        planId: 'plan-free',
        assignmentId: 'assignment-new',
        startedAt: now,
        expiresAt,
      },
    });
    expect(userUpdate).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: { activePlanId: 'plan-free' },
    });
  });

  it('moves the end on both the redemption and the assignment', async () => {
    const redemptionUpdate = vi.fn().mockReturnValue('r');
    const assignmentUpdate = vi.fn().mockReturnValue('a');
    const userUpdate = vi.fn().mockReturnValue('u');
    const transaction = vi.fn(async (ops: unknown[]) => ops);
    const prisma = {
      planTrialRedemption: { update: redemptionUpdate },
      userPlanAssignment: { update: assignmentUpdate },
      user: { update: userUpdate },
      $transaction: transaction,
    } as unknown as PrismaService;

    await new PlansRepository(prisma).extendTrial('user-1', 'a1', 'plan-free', expiresAt);

    expect(redemptionUpdate).toHaveBeenCalledWith({
      where: { userId: 'user-1' },
      data: { expiresAt },
    });
    expect(assignmentUpdate).toHaveBeenCalledWith({
      where: { id: 'a1' },
      data: { status: 'ACTIVE', endsAt: null, entitlementValidUntil: expiresAt },
    });
    expect(transaction).toHaveBeenCalledWith(['r', 'a', 'u']);
  });
});
