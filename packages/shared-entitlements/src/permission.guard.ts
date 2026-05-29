import {
  type CanActivate,
  type ExecutionContext,
  Inject,
  Injectable,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { type Permission, UserRole } from '@claw/shared-types';
import { EntitlementsAdapter } from './entitlements-adapter';
import { ENTITLEMENTS_ADAPTER, REQUIRE_PERMISSIONS_KEY } from './entitlements.tokens';

type RequestUser = { sub?: string; id?: string; role?: string };

// Permission-matrix enforcement. Resolves the caller's effective permissions
// from the auth-service (the admin-editable role→permission grants) and allows
// the request only if the user holds EVERY permission required by the route.
//
// Design notes:
// - Default-ALLOW when a route carries no @RequirePermissions metadata, so this
//   guard is a no-op except where explicitly applied — safe to register
//   globally without auditing every endpoint.
// - ADMIN bypasses via the JWT role claim BEFORE any network call, so admins
//   keep working even if the auth-service is unreachable.
// - For decorated (admin/config) routes, fail CLOSED on a resolution error: an
//   entitlements outage must never silently grant privileged access.
@Injectable()
export class PermissionGuard implements CanActivate {
  private readonly logger = new Logger(PermissionGuard.name);

  constructor(
    private readonly reflector: Reflector,
    @Inject(ENTITLEMENTS_ADAPTER) private readonly adapter: EntitlementsAdapter,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const required = this.reflector.getAllAndOverride<Permission[] | undefined>(
      REQUIRE_PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!required || required.length === 0) {
      return true;
    }
    const request = context.switchToHttp().getRequest<{ user?: RequestUser }>();
    const user = request.user;
    if (!user) {
      return false;
    }
    if (user.role === UserRole.ADMIN) {
      return true;
    }
    const userId = user.sub ?? user.id;
    if (userId === undefined) {
      return false;
    }
    return this.resolveAndCheck(userId, required);
  }

  private async resolveAndCheck(userId: string, required: Permission[]): Promise<boolean> {
    try {
      const ent = await this.adapter.getEntitlements(userId);
      if (ent.isAdmin) {
        return true;
      }
      return required.every((permission) => ent.permissions.includes(permission));
    } catch (error) {
      this.logger.warn(
        `canActivate: entitlements unavailable for user=${userId} — denying: ${(error as Error).message}`,
      );
      return false;
    }
  }
}
