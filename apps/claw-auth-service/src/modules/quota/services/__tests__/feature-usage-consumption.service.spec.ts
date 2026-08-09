import { PlanFeatureKey } from '../../../../generated/prisma';
import { FeatureUsageConsumptionService } from '../feature-usage-consumption.service';

describe('FeatureUsageConsumptionService', () => {
  it('idempotently reserves and consumes one research request', async () => {
    const entitlements = {
      getEnforcedForUser: jest.fn().mockResolvedValue({ isAdmin: false, plan: { id: 'plan-1' } }),
    };
    const policy = {
      reserve: jest.fn().mockResolvedValue({ ok: true, reservationId: 'usage-1' }),
      consume: jest.fn(async () => {}),
    };
    const service = new FeatureUsageConsumptionService(entitlements as never, policy as never);

    await service.record({
      userId: 'user-1',
      feature: PlanFeatureKey.WEB_SEARCH,
      requestId: 'search-1:provider-1',
    });

    expect(policy.reserve).toHaveBeenCalledWith({
      userId: 'user-1',
      planId: 'plan-1',
      feature: PlanFeatureKey.WEB_SEARCH,
      requestId: 'search-1:provider-1',
      billingPeriodKey: null,
    });
    expect(policy.consume).toHaveBeenCalledWith('usage-1');
  });

  it.each([
    { isAdmin: true, plan: null, label: 'an administrator' },
    { isAdmin: false, plan: null, label: 'a user without a plan' },
  ])('records observed provider operations for $label without reserving a limit', async (state) => {
    const entitlements = { getEnforcedForUser: jest.fn().mockResolvedValue(state) };
    const policy = {
      reserve: jest.fn(),
      consume: jest.fn(),
      observe: jest.fn(async () => {}),
    };
    const service = new FeatureUsageConsumptionService(entitlements as never, policy as never);

    await service.record({
      userId: 'user-1',
      feature: PlanFeatureKey.WEB_SEARCH,
      requestId: 'search-1:provider-1',
    });

    expect(policy.observe).toHaveBeenCalledWith({
      userId: 'user-1',
      feature: PlanFeatureKey.WEB_SEARCH,
      requestId: 'search-1:provider-1',
    });
    expect(policy.reserve).not.toHaveBeenCalled();
  });
});
