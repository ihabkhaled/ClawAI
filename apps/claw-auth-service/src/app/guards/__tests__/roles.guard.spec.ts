import { type ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Permission } from '@claw/shared-types';
import { UserRole } from '../../../common/enums';
import { PERMISSIONS_KEY } from '../../decorators/permissions.decorator';
import { RolesGuard } from '../roles.guard';

describe('RolesGuard permission enforcement', () => {
  const resolvePermissionsBySlug = jest.fn();
  function permissionProtectedHandler(): void {}
  Reflect.defineMetadata(
    PERMISSIONS_KEY,
    [Permission.ADMIN_USERS_MANAGE],
    permissionProtectedHandler,
  );

  beforeEach(() => {
    resolvePermissionsBySlug.mockReset();
  });

  it('allows an administrator with ADMIN_USERS_MANAGE through the route', async () => {
    resolvePermissionsBySlug.mockResolvedValue([Permission.ADMIN_USERS_MANAGE]);
    const guard = new RolesGuard(new Reflector(), { resolvePermissionsBySlug } as never);
    const context = createContext(UserRole.ADMIN);
    await expect(guard.canActivate(context)).resolves.toBe(true);
  });

  it('denies an administrator without ADMIN_USERS_MANAGE through the route', async () => {
    resolvePermissionsBySlug.mockResolvedValue([Permission.ADMIN_USAGE_VIEW]);
    const guard = new RolesGuard(new Reflector(), { resolvePermissionsBySlug } as never);
    const context = createContext(UserRole.ADMIN);
    await expect(guard.canActivate(context)).resolves.toBe(false);
  });

  function createContext(role: UserRole): ExecutionContext {
    return {
      getHandler: () => permissionProtectedHandler,
      getClass: () => RolesGuard,
      switchToHttp: () => ({
        getRequest: () => ({ user: { id: 'u1', role } }),
        getResponse: () => {},
        getNext: () => {},
      }),
      switchToRpc: () => ({ getContext: () => {}, getData: () => {} }),
      switchToWs: () => ({
        getClient: () => {},
        getData: () => {},
        getPattern: () => '',
      }),
      getArgs: () => [],
      getArgByIndex: () => {},
      getType: () => 'http',
    } as never;
  }
});
