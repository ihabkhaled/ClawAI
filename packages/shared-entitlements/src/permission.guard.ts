import {
  type CanActivate,
  type ExecutionContext,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { type Permission, UserRole } from '@claw/shared-types';
import { EntitlementsAdapter } from './entitlements-adapter';
import { ENTITLEMENTS_ADAPTER, REQUIRE_PERMISSIONS_KEY } from './entitlements.tokens';

type RequestUser = { sub?: string; id?: string; role?: string };
type GuardedRequest = {
  user?: RequestUser;
  method?: string;
  url?: string;
  ip?: string;
  headers?: Record<string, string | string[] | undefined>;
};

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
// - Denials throw the structured INSUFFICIENT_PERMISSIONS contract and are
//   audit-logged (ships to MongoDB via the Pino → server-logs pipeline).
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
    const request = context.switchToHttp().getRequest<GuardedRequest>();
    const user = request.user;
    const userId = user?.sub ?? user?.id;
    if (!user || userId === undefined) {
      throw new UnauthorizedException({
        errorCode: 'UNAUTHORIZED',
        messageKey: 'errors.auth.unauthorized',
      });
    }
    if (user.role === UserRole.ADMIN) {
      return true;
    }
    const granted = await this.resolveAndCheck(userId, required);
    if (!granted) {
      this.logDenied(userId, request, required);
      throw new ForbiddenException({
        errorCode: 'INSUFFICIENT_PERMISSIONS',
        messageKey: 'errors.permissions.insufficient',
        requiredPermissions: required,
      });
    }
    return true;
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
        `resolveAndCheck: entitlements unavailable for user=${userId} — failing closed: ${(error as Error).message}`,
      );
      return false;
    }
  }

  private logDenied(userId: string, request: GuardedRequest, required: Permission[]): void {
    const ua = request.headers?.['user-agent'];
    this.logger.warn(
      `permission denied user=${userId} ${request.method ?? '?'} ${request.url ?? '?'} ` +
        `required=[${required.join(',')}] ip=${request.ip ?? '?'} ua=${typeof ua === 'string' ? ua : '?'}`,
    );
  }
}
