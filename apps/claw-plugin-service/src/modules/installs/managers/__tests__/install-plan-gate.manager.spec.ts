import { ForbiddenException, ServiceUnavailableException } from '@nestjs/common';

import { InstallPlanGateManager } from '../install-plan-gate.manager';

type Plan = { allowPlugins: boolean; maxInstalledPlugins: number | null | undefined };

function entitlements(plan: Plan | null, isAdmin = false): unknown {
  return {
    isAdmin,
    plan:
      plan === null
        ? null
        : {
            featureGates: { allowPlugins: plan.allowPlugins },
            limits: { maxInstalledPlugins: plan.maxInstalledPlugins },
          },
  };
}

function buildManager(result: unknown, fail = false) {
  const adapter = {
    getEntitlements: fail
      ? vi.fn().mockRejectedValue(new Error('auth-service down'))
      : vi.fn().mockResolvedValue(result),
  };
  return { manager: new InstallPlanGateManager(adapter as never), adapter };
}

describe('InstallPlanGateManager', () => {
  it('returns the plan cap', async () => {
    const { manager, adapter } = buildManager(
      entitlements({ allowPlugins: true, maxInstalledPlugins: 5 }),
    );

    await expect(manager.resolveInstallCap('user-1')).resolves.toBe(5);
    expect(adapter.getEntitlements).toHaveBeenCalledWith('user-1');
  });

  it('keeps null as unlimited', async () => {
    const { manager } = buildManager(
      entitlements({ allowPlugins: true, maxInstalledPlugins: null }),
    );

    await expect(manager.resolveInstallCap('user-1')).resolves.toBeNull();
  });

  it('keeps 0 as disabled, never as unlimited', async () => {
    const { manager } = buildManager(entitlements({ allowPlugins: true, maxInstalledPlugins: 0 }));

    await expect(manager.resolveInstallCap('user-1')).resolves.toBe(0);
  });

  it('treats an admin as unlimited whatever the plan says', async () => {
    const { manager } = buildManager(
      entitlements({ allowPlugins: false, maxInstalledPlugins: 0 }, true),
    );

    await expect(manager.resolveInstallCap('admin-1')).resolves.toBeNull();
  });

  it('answers 403 PLUGIN_PLAN_DISABLED when the allowPlugins gate is off', async () => {
    const { manager } = buildManager(
      entitlements({ allowPlugins: false, maxInstalledPlugins: 10 }),
    );

    const failure = await manager.resolveInstallCap('user-1').catch((error: unknown) => error);

    expect(failure).toBeInstanceOf(ForbiddenException);
    expect((failure as ForbiddenException).getResponse()).toMatchObject({
      errorCode: 'PLUGIN_PLAN_DISABLED',
    });
  });

  it('reads a user without a plan as having no gate', async () => {
    const { manager } = buildManager(entitlements(null));

    await expect(manager.resolveInstallCap('user-1')).rejects.toBeInstanceOf(ForbiddenException);
  });

  it.each([
    ['missing (an older auth-service)', undefined],
    ['negative', -1],
    ['fractional', 2.5],
    ['not a number', 'ten'],
  ])('fails closed with 503 when the cap is %s', async (_label, cap) => {
    const { manager } = buildManager(
      entitlements({ allowPlugins: true, maxInstalledPlugins: cap as never }),
    );

    const failure = await manager.resolveInstallCap('user-1').catch((error: unknown) => error);

    expect(failure).toBeInstanceOf(ServiceUnavailableException);
    expect((failure as ServiceUnavailableException).getResponse()).toMatchObject({
      errorCode: 'PLUGIN_ENTITLEMENTS_UNAVAILABLE',
    });
  });

  it('fails closed with 503 when auth-service cannot answer', async () => {
    const { manager } = buildManager(undefined, true);

    await expect(manager.resolveInstallCap('user-1')).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });
});
