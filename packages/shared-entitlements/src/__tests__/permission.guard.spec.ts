import { Permission } from '@claw/shared-types';
import { PermissionGuard } from '../permission.guard';

type MockReflector = { getAllAndOverride: jest.Mock };
type MockAdapter = { getEntitlements: jest.Mock };

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
    reflector = { getAllAndOverride: jest.fn() };
    adapter = { getEntitlements: jest.fn() };
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

  it('fails CLOSED (throws FORBIDDEN) when the entitlements lookup throws', async () => {
    reflector.getAllAndOverride.mockReturnValue([Permission.ADMIN_LOGS_VIEW]);
    adapter.getEntitlements.mockRejectedValue(new Error('auth down'));
    await expect(guard.canActivate(makeContext({ sub: 'u1', role: 'USER' }))).rejects.toMatchObject(
      {
        response: { errorCode: 'INSUFFICIENT_PERMISSIONS' },
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
