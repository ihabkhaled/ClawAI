import { ForbiddenException } from '@nestjs/common';

import { InstallPlanGateManager } from '../install-plan-gate.manager';

function entitlements(planSlug: string | null, isAdmin = false): unknown {
  return {
    isAdmin,
    plan:
      planSlug === null
        ? null
        : {
            slug: planSlug,
            featureGates: { allowPlugins: true },
            limits: { maxInstalledPlugins: 5 },
          },
  };
}

function build(result: unknown): InstallPlanGateManager {
  return new InstallPlanGateManager({
    getEntitlements: vi.fn().mockResolvedValue(result),
  } as never);
}

describe('admin catalog per-plan gate: InstallPlanGateManager', () => {
  it('an empty list means every plan', async () => {
    await expect(build(entitlements('free')).resolveInstallCap('u1', [])).resolves.toBe(5);
    await expect(build(entitlements('free')).resolveInstallCap('u1')).resolves.toBe(5);
  });

  it('lets a plan on the list install', async () => {
    await expect(build(entitlements('pro')).resolveInstallCap('u1', ['pro', 'max'])).resolves.toBe(
      5,
    );
  });

  it('refuses a plan that is not on the list with 403 PLUGIN_PLAN_DISABLED', async () => {
    const failure = await build(entitlements('free'))
      .resolveInstallCap('u1', ['pro'])
      .catch((error: unknown) => error);

    expect(failure).toBeInstanceOf(ForbiddenException);
    expect((failure as ForbiddenException).getResponse()).toMatchObject({
      errorCode: 'PLUGIN_PLAN_DISABLED',
    });
  });

  it('lets an admin through whatever the list says', async () => {
    await expect(
      build(entitlements('free', true)).resolveInstallCap('u1', ['enterprise']),
    ).resolves.toBeNull();
  });

  it('refuses a user with no plan when a list is set', async () => {
    const failure = await build({ isAdmin: false, plan: null })
      .resolveInstallCap('u1', ['pro'])
      .catch((error: unknown) => error);

    expect(failure).toBeInstanceOf(ForbiddenException);
  });
});
