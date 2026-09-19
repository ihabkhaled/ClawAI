import { beforeEach, describe, expect, it, vi } from 'vitest';

import { EntitlementsInternalController } from '../entitlements-internal.controller';

/**
 * The internal entitlements read serves two kinds of caller. AI-use gates want
 * an expired trial to THROW (that is how chat refuses and shows "trial ended").
 * Permission and feature checks must not: with the throw, every PermissionGuard
 * failed closed for a trial-expired user, and eight production users lost
 * memory and context packs that their role and the Free plan both grant.
 */
describe('EntitlementsInternalController', () => {
  let getForUser: ReturnType<typeof vi.fn>;
  let getEnforcedForUser: ReturnType<typeof vi.fn>;
  let controller: EntitlementsInternalController;

  beforeEach(() => {
    getForUser = vi.fn().mockResolvedValue({ userId: 'u1', enforced: false });
    getEnforcedForUser = vi.fn().mockResolvedValue({ userId: 'u1', enforced: true });
    controller = new EntitlementsInternalController({ getForUser, getEnforcedForUser } as never);
  });

  it('enforces the trial by default', async () => {
    await controller.getEntitlements('u1');
    expect(getEnforcedForUser).toHaveBeenCalledWith('u1');
    expect(getForUser).not.toHaveBeenCalled();
  });

  it('skips the trial throw only when asked with enforceTrial=false', async () => {
    await controller.getEntitlements('u1', 'false');
    expect(getForUser).toHaveBeenCalledWith('u1');
    expect(getEnforcedForUser).not.toHaveBeenCalled();
  });

  it('treats any other value as the enforced default', async () => {
    await controller.getEntitlements('u1', 'nope');
    expect(getEnforcedForUser).toHaveBeenCalledWith('u1');
  });
});
