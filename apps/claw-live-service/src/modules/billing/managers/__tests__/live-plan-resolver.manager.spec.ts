import { LivePlanResolverManager } from '../live-plan-resolver.manager';

function setup() {
  const entitlements = { getEntitlements: vi.fn().mockResolvedValue({ plan: { slug: 'pro' } }) };
  const policies = {
    planPolicy: vi.fn().mockReturnValue({ freeSecondsPerMonth: 1, paidMicroUsdPerMinute: 2 }),
  };
  return {
    manager: new LivePlanResolverManager(entitlements as never, policies as never),
    entitlements,
    policies,
  };
}

describe('LivePlanResolverManager', () => {
  it('resolves the plan slug without enforcing the trial and caches it', async () => {
    const { manager, entitlements } = setup();
    await expect(manager.planSlug('u1')).resolves.toBe('pro');
    await expect(manager.planSlug('u1')).resolves.toBe('pro');
    expect(entitlements.getEntitlements).toHaveBeenCalledTimes(1);
    expect(entitlements.getEntitlements).toHaveBeenCalledWith('u1', { enforceTrial: false });
  });

  it('falls back to the default plan (null slug) when auth is unreachable', async () => {
    const { manager, entitlements } = setup();
    entitlements.getEntitlements.mockRejectedValue(new Error('down'));
    await expect(manager.planSlug('u2')).resolves.toBeNull();
  });

  it('maps a user without a plan to null', async () => {
    const { manager, entitlements } = setup();
    entitlements.getEntitlements.mockResolvedValue({ plan: null });
    await expect(manager.planSlug('u3')).resolves.toBeNull();
  });

  it('hands the slug to the policy for the plan numbers', async () => {
    const { manager, policies } = setup();
    const policy = { version: 1, config: {} } as never;
    await manager.planPolicy(policy, 'u1');
    expect(policies.planPolicy).toHaveBeenCalledWith(policy, 'pro');
  });
});
