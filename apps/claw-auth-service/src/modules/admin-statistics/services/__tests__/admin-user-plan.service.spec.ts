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
      id: 'assign-paid',
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
        assignmentId: 'assign-trial',
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
      // A paid subscription already replaced this trial, so the countdown is
      // history rather than something the user is still living through.
      state: 'SUPERSEDED',
    });
    expect(result.generatedAt).toBe(NOW.toISOString());
  });

  it('marks a lapsed trial expired with zero days rather than a negative count', async () => {
    const plans = {
      findLatestAssignmentForUser: jest.fn().mockResolvedValue(null),
      findTrialRedemption: jest.fn().mockResolvedValue({
        assignmentId: 'assign-trial',
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
  // ── Trial supersession (reported 2026-09-06) ──────────────────────────────
  //
  // An operator moved magdy.abass onto Pro with an admin grant valid for a
  // year. The panel went on reporting "Free trial — 23 days left" beside it,
  // because PlanTrialRedemption is written once per user and outlives the
  // assignment that created it, so its expiresAt kept counting down. The
  // countdown was arithmetically right and completely misleading: the trial had
  // been replaced a week earlier.
  function buildTrialRedemption(): Record<string, unknown> {
    return {
      assignmentId: 'assign-trial',
      startedAt: new Date('2026-08-30T11:15:03.000Z'),
      expiresAt: new Date('2026-09-29T11:14:53.000Z'),
    };
  }

  it('reports a trial replaced by an admin grant as SUPERSEDED, not as a live countdown', async () => {
    const plans = {
      findLatestAssignmentForUser: jest.fn().mockResolvedValue({
        ...buildAssignment(),
        id: 'assign-admin',
        grantType: 'ADMIN_GRANT',
        grantReason: 'for free',
        startsAt: new Date('2026-09-06T14:04:37.000Z'),
        entitlementValidUntil: new Date('2027-09-06T14:04:37.000Z'),
        sourceSubscriptionId: null,
      }),
      findTrialRedemption: jest.fn().mockResolvedValue(buildTrialRedemption()),
      findById: jest.fn().mockResolvedValue(buildPlan()),
    };
    const service = new AdminUserPlanService(plans as never);

    const result = await service.getPlanOverview('user-1');

    expect(result.trial?.state).toBe('SUPERSEDED');
    // The dates stay truthful — this is still the user's real trial history,
    // and an operator reconstructing the account needs them.
    expect(result.trial?.expiresAt).toBe('2026-09-29T11:14:53.000Z');
    expect(result.trial?.isExpired).toBe(false);
    expect(result.assignment?.grantType).toBe('ADMIN_GRANT');
  });

  it('keeps a trial ACTIVE while it is still the grant in force', async () => {
    const plans = {
      findLatestAssignmentForUser: jest.fn().mockResolvedValue({
        ...buildAssignment(),
        id: 'assign-trial',
        grantType: 'FREE_DEFAULT',
        sourceSubscriptionId: null,
      }),
      findTrialRedemption: jest.fn().mockResolvedValue(buildTrialRedemption()),
      findById: jest.fn().mockResolvedValue(buildPlan()),
    };
    const service = new AdminUserPlanService(plans as never);

    const result = await service.getPlanOverview('user-1');

    expect(result.trial?.state).toBe('ACTIVE');
    expect(result.trial?.daysRemaining).toBeGreaterThan(0);
  });

  it('calls a trial that ran out under its own assignment EXPIRED', async () => {
    const plans = {
      findLatestAssignmentForUser: jest.fn().mockResolvedValue({
        ...buildAssignment(),
        id: 'assign-trial',
        grantType: 'FREE_DEFAULT',
        sourceSubscriptionId: null,
      }),
      findTrialRedemption: jest.fn().mockResolvedValue({
        ...buildTrialRedemption(),
        expiresAt: new Date('2026-08-01T00:00:00.000Z'),
      }),
      findById: jest.fn().mockResolvedValue(buildPlan()),
    };
    const service = new AdminUserPlanService(plans as never);

    const result = await service.getPlanOverview('user-1');

    expect(result.trial?.state).toBe('EXPIRED');
    expect(result.trial?.daysRemaining).toBe(0);
  });

  it('prefers SUPERSEDED over EXPIRED when the replaced trial had also run out', async () => {
    // Both are true. Reporting EXPIRED would read as "this user lost access on
    // 1 August", when what they actually hold is the grant that replaced it.
    const plans = {
      findLatestAssignmentForUser: jest.fn().mockResolvedValue({
        ...buildAssignment(),
        id: 'assign-admin',
        grantType: 'ADMIN_GRANT',
      }),
      findTrialRedemption: jest.fn().mockResolvedValue({
        ...buildTrialRedemption(),
        expiresAt: new Date('2026-08-01T00:00:00.000Z'),
      }),
      findById: jest.fn().mockResolvedValue(buildPlan()),
    };
    const service = new AdminUserPlanService(plans as never);

    const result = await service.getPlanOverview('user-1');

    expect(result.trial?.state).toBe('SUPERSEDED');
    expect(result.trial?.isExpired).toBe(true);
  });
});
