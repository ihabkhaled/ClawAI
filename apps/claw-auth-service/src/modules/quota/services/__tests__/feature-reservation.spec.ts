import { vi } from 'vitest';
import { PlanFeatureKey } from '../../../../generated/prisma';
import { FeatureSettlement } from '../../enums/feature-settlement.enum';
import { FeatureUsageConsumptionService } from '../feature-usage-consumption.service';

// F3d (ADR-110): the first metered feature that can refuse. AI-written files
// are reserved before the model writes them, consumed when delivered and
// released when the work fails.
const build = (
  entitlementState: unknown,
  policy: Record<string, unknown>,
): FeatureUsageConsumptionService =>
  new FeatureUsageConsumptionService(
    { getEnforcedForUser: vi.fn().mockResolvedValue(entitlementState) } as never,
    policy as never,
  );

const input = { userId: 'u1', feature: PlanFeatureKey.FILE_GENERATION, requestId: 'msg-1' };

describe('FeatureUsageConsumptionService.reserve', () => {
  it('holds a run within the allowance', async () => {
    const policy = { reserve: vi.fn().mockResolvedValue({ ok: true, reservationId: 'r1' }) };
    const service = build({ isAdmin: false, plan: { id: 'free' } }, policy);

    await expect(service.reserve(input)).resolves.toEqual({ allowed: true, reservationId: 'r1' });
    expect(policy.reserve).toHaveBeenCalledWith({
      ...input,
      planId: 'free',
      billingPeriodKey: null,
    });
  });

  it('refuses once the daily allowance is used, with the numbers to show', async () => {
    const policy = {
      reserve: vi
        .fn()
        .mockResolvedValue({ ok: false, reason: 'FEATURE_TRIAL_EXHAUSTED', used: 15, limit: 15 }),
      evaluate: vi.fn().mockResolvedValue({ window: 'DAY' }),
    };
    const service = build({ isAdmin: false, plan: { id: 'free' } }, policy);

    await expect(service.reserve(input)).resolves.toEqual({
      allowed: false,
      reason: 'FEATURE_TRIAL_EXHAUSTED',
      used: 15,
      limit: 15,
      window: 'DAY',
    });
  });

  it.each([
    { who: 'an administrator', state: { isAdmin: true, plan: { id: 'pro' } } },
    { who: 'a user without a plan', state: { isAdmin: false, plan: null } },
  ])('never refuses $who, and leaves nothing to settle', async ({ state }) => {
    const policy = { reserve: vi.fn(), observe: vi.fn(async () => {}) };
    const service = build(state, policy);

    await expect(service.reserve(input)).resolves.toEqual({ allowed: true, reservationId: null });
    expect(policy.reserve).not.toHaveBeenCalled();
    expect(policy.observe).toHaveBeenCalledWith(input);
  });
});

describe('FeatureUsageConsumptionService.settle', () => {
  it.each([
    [FeatureSettlement.CONSUME, 'consume'],
    [FeatureSettlement.RELEASE, 'release'],
  ])('%s settles through policy.%s', async (outcome, method) => {
    const policy = { consume: vi.fn(async () => {}), release: vi.fn(async () => {}) };
    await build({}, policy).settle('r1', outcome);

    expect(policy[method as 'consume' | 'release']).toHaveBeenCalledWith('r1');
  });
});
