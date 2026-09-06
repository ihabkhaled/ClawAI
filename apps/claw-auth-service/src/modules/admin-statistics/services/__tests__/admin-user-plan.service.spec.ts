import { AdminUserPlanService } from '../admin-user-plan.service';

describe('AdminUserPlanService', () => {
  const NOW = new Date('2026-09-06T12:00:00.000Z');

  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(NOW);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  function buildAssignment(): Record<string, unknown> {
    return {
      planId: 'plan-pro',
      status: 'ACTIVE',
      grantType: 'PAID_SUBSCRIPTION',
      grantReason: null,
      startsAt: new Date('2026-08-01T00:00:00.000Z'),
      endsAt: null,
      entitlementValidUntil: new Date('2026-10-01T00:00:00.000Z'),
      sourceSubscriptionId: 'sub-1',
    };
  }

  function buildPlan(): Record<string, unknown> {
    return {
      id: 'plan-pro',
      slug: 'pro',
      name: 'Pro',
      isTrial: false,
      trialDurationDays: null,
    };
  }

  it('reports the plan, its grant provenance and the trial together', async () => {
    const plans = {
      findLatestAssignmentForUser: jest.fn().mockResolvedValue(buildAssignment()),
      findTrialRedemption: jest.fn().mockResolvedValue({
        startedAt: new Date('2026-08-20T09:00:00.000Z'),
        expiresAt: new Date('2026-09-19T09:00:00.000Z'),
      }),
      findById: jest.fn().mockResolvedValue(buildPlan()),
    };
    const service = new AdminUserPlanService(plans as never);

    const result = await service.getPlanOverview('user-1');

    expect(result.plan).toEqual({
      id: 'plan-pro',
      slug: 'pro',
      name: 'Pro',
      isTrial: false,
      trialDurationDays: null,
    });
    expect(result.assignment).toEqual({
      status: 'ACTIVE',
      grantType: 'PAID_SUBSCRIPTION',
      grantReason: null,
      startsAt: '2026-08-01T00:00:00.000Z',
      endsAt: null,
      entitlementValidUntil: '2026-10-01T00:00:00.000Z',
      sourceSubscriptionId: 'sub-1',
    });
    // 2026-09-19T09:00 minus 2026-09-06T12:00 is 12 days 21 hours -> 13.
    expect(result.trial).toEqual({
      startedAt: '2026-08-20T09:00:00.000Z',
      expiresAt: '2026-09-19T09:00:00.000Z',
      daysRemaining: 13,
      isExpired: false,
    });
    expect(result.generatedAt).toBe(NOW.toISOString());
  });

  it('marks a lapsed trial expired with zero days rather than a negative count', async () => {
    const plans = {
      findLatestAssignmentForUser: jest.fn().mockResolvedValue(null),
      findTrialRedemption: jest.fn().mockResolvedValue({
        startedAt: new Date('2026-06-01T00:00:00.000Z'),
        expiresAt: new Date('2026-07-01T00:00:00.000Z'),
      }),
      findById: jest.fn(),
    };
    const service = new AdminUserPlanService(plans as never);

    const result = await service.getPlanOverview('user-1');

    expect(result.trial?.daysRemaining).toBe(0);
    expect(result.trial?.isExpired).toBe(true);
    // The trial outlives the assignment on purpose: an operator asking "why did
    // this user lose access" needs the history, not a blank panel.
    expect(result.assignment).toBeNull();
    expect(result.plan).toBeNull();
  });

  it('does not look up a plan when the user has no assignment', async () => {
    const plans = {
      findLatestAssignmentForUser: jest.fn().mockResolvedValue(null),
      findTrialRedemption: jest.fn().mockResolvedValue(null),
      findById: jest.fn(),
    };
    const service = new AdminUserPlanService(plans as never);

    const result = await service.getPlanOverview('user-1');

    expect(plans.findById).not.toHaveBeenCalled();
    expect(result).toEqual({
      userId: 'user-1',
      generatedAt: NOW.toISOString(),
      plan: null,
      assignment: null,
      trial: null,
    });
  });

  it('reports an expired grant instead of hiding it', async () => {
    const plans = {
      findLatestAssignmentForUser: jest.fn().mockResolvedValue({
        ...buildAssignment(),
        status: 'EXPIRED',
        grantType: 'ADMIN_GRANT',
        grantReason: 'Migrated from legacy contract',
        entitlementValidUntil: new Date('2026-08-15T00:00:00.000Z'),
      }),
      findTrialRedemption: jest.fn().mockResolvedValue(null),
      findById: jest.fn().mockResolvedValue(buildPlan()),
    };
    const service = new AdminUserPlanService(plans as never);

    const result = await service.getPlanOverview('user-1');

    expect(result.assignment?.status).toBe('EXPIRED');
    expect(result.assignment?.grantReason).toBe('Migrated from legacy contract');
    expect(result.assignment?.entitlementValidUntil).toBe('2026-08-15T00:00:00.000Z');
  });
});
