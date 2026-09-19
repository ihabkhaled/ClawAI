import { type Mock, vi } from 'vitest';
import { Permission } from '@claw/shared-types';
import { PermissionGuard } from '../permission.guard';

type MockReflector = { getAllAndOverride: Mock };
type MockAdapter = { getEntitlements: Mock };

function makeContext(user?: unknown): any {
  return {
    getHandler: () => {},
    getClass: () => {},
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
  };
}

function makeEnt(overrides: Record<string, unknown> = {}): any {
  return {
    userId: 'u1',
    role: 'USER',
    isAdmin: false,
    permissions: [],
    plan: null,
    allowedModels: [],
    allowedProviders: [],
    quota: { dailyLimit: 0, used: 0, remaining: 0, unlimited: false },
    ...overrides,
  };
}

describe('PermissionGuard', () => {
  let reflector: MockReflector;
  let adapter: MockAdapter;
  let guard: PermissionGuard;

  beforeEach(() => {
    reflector = { getAllAndOverride: vi.fn() };
    adapter = { getEntitlements: vi.fn() };
    guard = new PermissionGuard(reflector as any, adapter as any);
  });

  it('allows (default-allow) when the route declares no required permissions', async () => {
    // getAllAndOverride mock returns undefined by default → no metadata.
    await expect(guard.canActivate(makeContext({ sub: 'u1', role: 'USER' }))).resolves.toBe(true);
    expect(adapter.getEntitlements).not.toHaveBeenCalled();
  });

  it('allows ADMIN by JWT role claim without any network call', async () => {
    reflector.getAllAndOverride.mockReturnValue([Permission.ADMIN_CONNECTORS_MANAGE]);
    await expect(guard.canActivate(makeContext({ sub: 'a1', role: 'ADMIN' }))).resolves.toBe(true);
    expect(adapter.getEntitlements).not.toHaveBeenCalled();
  });

  it('throws UNAUTHORIZED when there is no authenticated user', async () => {
    reflector.getAllAndOverride.mockReturnValue([Permission.ADMIN_CONNECTORS_MANAGE]);
    await expect(guard.canActivate(makeContext())).rejects.toMatchObject({
      response: { errorCode: 'UNAUTHORIZED' },
    });
  });

  it('allows when the user holds every required permission', async () => {
    reflector.getAllAndOverride.mockReturnValue([Permission.ADMIN_ROUTING_MANAGE]);
    adapter.getEntitlements.mockResolvedValue(
      makeEnt({ permissions: [Permission.ADMIN_ROUTING_MANAGE, Permission.CHAT_USE] }),
    );
    await expect(guard.canActivate(makeContext({ sub: 'u1', role: 'USER' }))).resolves.toBe(true);
  });

  it('throws INSUFFICIENT_PERMISSIONS (with requiredPermissions) when missing a permission', async () => {
    reflector.getAllAndOverride.mockReturnValue([Permission.ADMIN_ROUTING_MANAGE]);
    adapter.getEntitlements.mockResolvedValue(makeEnt({ permissions: [Permission.CHAT_USE] }));
    await expect(guard.canActivate(makeContext({ sub: 'u1', role: 'USER' }))).rejects.toMatchObject(
      {
        response: {
          errorCode: 'INSUFFICIENT_PERMISSIONS',
          requiredPermissions: [Permission.ADMIN_ROUTING_MANAGE],
        },
      },
    );
  });

  it('allows when entitlements mark the user as admin (isAdmin)', async () => {
    reflector.getAllAndOverride.mockReturnValue([Permission.ADMIN_USERS_MANAGE]);
    adapter.getEntitlements.mockResolvedValue(makeEnt({ isAdmin: true, permissions: [] }));
    await expect(guard.canActivate(makeContext({ sub: 'u1', role: 'OPERATOR' }))).resolves.toBe(
      true,
    );
  });

  // Still fails CLOSED — access is denied either way. But an outage used to be
  // reported as the same 403 as a genuinely missing permission, so "auth-service
  // is unreachable" and "your role lacks MEMORY_USE" were indistinguishable in
  // production: both read "Forbidden Exception", and an admin who had just
  // granted the permission had no way to tell which one they were looking at.
  it('fails CLOSED with a 503 outage, not a 403 denial, when the lookup throws', async () => {
    reflector.getAllAndOverride.mockReturnValue([Permission.ADMIN_LOGS_VIEW]);
    adapter.getEntitlements.mockRejectedValue(new Error('auth down'));
    await expect(guard.canActivate(makeContext({ sub: 'u1', role: 'USER' }))).rejects.toMatchObject(
      {
        status: 503,
        response: { errorCode: 'ENTITLEMENTS_UNAVAILABLE' },
      },
    );
  });

  // Every service's exception filter reads `message`. The guard set none, so
  // each one fell back to the class name and the user saw "Forbidden
  // Exception" with the missing permission thrown away.
  it('names exactly the missing permissions in the message', async () => {
    reflector.getAllAndOverride.mockReturnValue([Permission.MEMORY_USE, Permission.CHAT_USE]);
    adapter.getEntitlements.mockResolvedValue(makeEnt({ permissions: [Permission.CHAT_USE] }));
    await expect(guard.canActivate(makeContext({ sub: 'u1', role: 'USER' }))).rejects.toMatchObject(
      {
        status: 403,
        response: {
          message: 'Missing permission: MEMORY_USE',
          missingPermissions: [Permission.MEMORY_USE],
        },
      },
    );
  });

  it('requires ALL listed permissions (AND semantics)', async () => {
    reflector.getAllAndOverride.mockReturnValue([
      Permission.ADMIN_PLANS_MANAGE,
      Permission.ADMIN_USERS_MANAGE,
    ]);
    adapter.getEntitlements.mockResolvedValue(
      makeEnt({ permissions: [Permission.ADMIN_PLANS_MANAGE] }),
    );
    await expect(guard.canActivate(makeContext({ sub: 'u1', role: 'USER' }))).rejects.toMatchObject(
      {
        response: { errorCode: 'INSUFFICIENT_PERMISSIONS' },
      },
    );
  });
});
