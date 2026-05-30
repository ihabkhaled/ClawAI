import { Reflector } from '@nestjs/core';
import { Permission, UserRole } from '@claw/shared-types';
import { PermissionGuard, REQUIRE_PERMISSIONS_KEY } from '@claw/shared-entitlements';
import { FilesController } from '../controllers/files.controller';
import { type FilesService } from '../services/files.service';

// Slice C — permission gate proof for the user-facing file endpoints.
// FilesController carries @RequirePermissions(Permission.FILES_USE) at the
// class level. We verify the guard correctly:
//   1. Denies a USER who lacks FILES_USE (ForbiddenException with the
//      INSUFFICIENT_PERMISSIONS structured contract).
//   2. Allows a USER who holds FILES_USE so the request lands on the service.
//   3. Lets an ADMIN through by JWT role-claim short-circuit even when the
//      entitlements adapter would have rejected them — RBAC hierarchy bypass.
//
// We exercise the *guard* directly (the unit under test) rather than mounting
// the controller through HTTP — that mirrors the existing PermissionGuard
// spec pattern in packages/shared-entitlements/src/__tests__ and keeps this
// test deterministic with no nginx/auth-service dependency.

type MockReflector = { getAllAndOverride: jest.Mock };
type MockAdapter = { getEntitlements: jest.Mock };

type GuardedUser = { sub?: string; id?: string; role?: string };

function makeContext(user?: GuardedUser, handler?: () => unknown, klass?: () => unknown): any {
  return {
    getHandler: () => handler ?? ((): void => {}),
    getClass: () => klass ?? FilesController,
    switchToHttp: () => ({
      getRequest: () => ({
        user,
        method: 'GET',
        url: '/api/v1/files',
        ip: '127.0.0.1',
        headers: { 'user-agent': 'jest' },
      }),
    }),
  };
}

function makeEntitlements(overrides: Record<string, unknown> = {}): unknown {
  return {
    userId: 'u-test',
    role: UserRole.USER,
    isAdmin: false,
    permissions: [],
    plan: null,
    allowedModels: [],
    allowedProviders: [],
    quota: { dailyLimit: 0, used: 0, remaining: 0, unlimited: false },
    ...overrides,
  };
}

describe('FilesController @RequirePermissions(Permission.FILES_USE) gate', () => {
  let reflector: MockReflector;
  let adapter: MockAdapter;
  let guard: PermissionGuard;

  beforeEach(() => {
    // The real Reflector reads class metadata set by @RequirePermissions.
    // We assert the decorator actually wired Permission.FILES_USE first, then
    // use a mock Reflector for the per-test guard runs so we keep full
    // control over the metadata value the guard sees.
    const realReflector = new Reflector();
    const meta = realReflector.get<Permission[]>(REQUIRE_PERMISSIONS_KEY, FilesController);
    expect(meta).toEqual([Permission.FILES_USE]);

    reflector = { getAllAndOverride: jest.fn() };
    adapter = { getEntitlements: jest.fn() };
    guard = new PermissionGuard(reflector as never, adapter as never);
  });

  it('USER without FILES_USE → throws ForbiddenException with INSUFFICIENT_PERMISSIONS contract', async () => {
    reflector.getAllAndOverride.mockReturnValue([Permission.FILES_USE]);
    adapter.getEntitlements.mockResolvedValue(
      makeEntitlements({ permissions: [Permission.CHAT_USE] }),
    );

    await expect(
      guard.canActivate(makeContext({ sub: 'user-no-files', role: UserRole.USER })),
    ).rejects.toMatchObject({
      response: {
        errorCode: 'INSUFFICIENT_PERMISSIONS',
        requiredPermissions: [Permission.FILES_USE],
      },
    });
    expect(adapter.getEntitlements).toHaveBeenCalledWith('user-no-files');
  });

  it('USER with FILES_USE → guard allows; controller forwards to service', async () => {
    reflector.getAllAndOverride.mockReturnValue([Permission.FILES_USE]);
    adapter.getEntitlements.mockResolvedValue(
      makeEntitlements({ permissions: [Permission.FILES_USE] }),
    );

    await expect(
      guard.canActivate(makeContext({ sub: 'user-with-files', role: UserRole.USER })),
    ).resolves.toBe(true);

    // Prove the controller still wires through to the service when the guard
    // would have allowed the request. Mock the service layer and call the
    // controller method directly — the guard already passed above.
    const serviceMock = {
      uploadFile: jest.fn(),
      getFiles: jest.fn().mockResolvedValue({ data: [], meta: { total: 0, page: 1 } }),
      getFile: jest.fn(),
      deleteFile: jest.fn(),
      downloadFile: jest.fn(),
      getChunks: jest.fn(),
    };
    const controller = new FilesController(serviceMock as unknown as FilesService);
    const result = await controller.findAll(
      { id: 'user-with-files' } as never,
      { page: 1, limit: 20 } as never,
    );
    expect(result).toEqual({ data: [], meta: { total: 0, page: 1 } });
    expect(serviceMock.getFiles).toHaveBeenCalledWith('user-with-files', { page: 1, limit: 20 });
  });

  it('ADMIN → guard bypasses permission check via JWT role claim (RBAC hierarchy)', async () => {
    reflector.getAllAndOverride.mockReturnValue([Permission.FILES_USE]);
    // Adapter must NOT be hit — ADMIN short-circuits before any network call so
    // admins keep working even if the auth-service is unreachable.

    await expect(
      guard.canActivate(makeContext({ sub: 'admin-1', role: UserRole.ADMIN })),
    ).resolves.toBe(true);
    expect(adapter.getEntitlements).not.toHaveBeenCalled();
  });

  it('ADMIN bypass holds even when the adapter would explicitly deny', async () => {
    reflector.getAllAndOverride.mockReturnValue([Permission.FILES_USE]);
    // Sanity belt-and-braces: even if the adapter happened to be called, an
    // ADMIN must still be allowed. We assert the call never happens (above)
    // AND that the result is still true under a hostile adapter mock.
    adapter.getEntitlements.mockResolvedValue(makeEntitlements({ permissions: [] }));

    await expect(
      guard.canActivate(makeContext({ sub: 'admin-2', role: UserRole.ADMIN })),
    ).resolves.toBe(true);
  });

  it('unauthenticated request to a FILES_USE-guarded route → UNAUTHORIZED', async () => {
    reflector.getAllAndOverride.mockReturnValue([Permission.FILES_USE]);

    await expect(guard.canActivate(makeContext())).rejects.toMatchObject({
      response: { errorCode: 'UNAUTHORIZED' },
    });
  });

  it('entitlements adapter throws → fails CLOSED (still INSUFFICIENT_PERMISSIONS)', async () => {
    reflector.getAllAndOverride.mockReturnValue([Permission.FILES_USE]);
    adapter.getEntitlements.mockRejectedValue(new Error('auth-service unreachable'));

    await expect(
      guard.canActivate(makeContext({ sub: 'user-outage', role: UserRole.USER })),
    ).rejects.toMatchObject({
      response: { errorCode: 'INSUFFICIENT_PERMISSIONS' },
    });
  });
});
