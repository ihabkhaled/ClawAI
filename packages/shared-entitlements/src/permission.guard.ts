import {
  type CanActivate,
  type ExecutionContext,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  ServiceUnavailableException,
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
    const missing = await this.resolveMissing(userId, required);
    if (missing.length > 0) {
      this.logDenied(userId, request, required);
      // `message` is what every service's exception filter reads. Without it
      // each filter fell back to the class name, and a user — or the admin who
      // had just granted the permission — saw "Forbidden Exception" with no
      // way to tell which permission was missing.
      throw new ForbiddenException({
        message: `Missing permission: ${missing.join(', ')}`,
        errorCode: 'INSUFFICIENT_PERMISSIONS',
        messageKey: 'errors.permissions.insufficient',
        requiredPermissions: required,
        missingPermissions: missing,
      });
    }
    return true;
  }

  /** The required permissions the user does not hold; empty means allowed. */
  private async resolveMissing(userId: string, required: Permission[]): Promise<Permission[]> {
    let ent;
    try {
      // Permissions are role state, not billing state: an expired trial must
      // not strip a user of what their role grants. See getEntitlements.
      ent = await this.adapter.getEntitlements(userId, { enforceTrial: false });
    } catch (error) {
      this.logger.warn(
        `resolveMissing: entitlements unavailable for user=${userId} — failing closed: ${(error as Error).message}`,
      );
      // Still fails CLOSED, but as an outage. A 403 here was indistinguishable
      // from a real missing permission, so "auth-service is unreachable" was
      // debugged as "the role matrix did not save".
      throw new ServiceUnavailableException({
        message: 'Permissions could not be checked right now. Please try again.',
        errorCode: 'ENTITLEMENTS_UNAVAILABLE',
        messageKey: 'errors.permissions.unavailable',
      });
    }
    if (ent.isAdmin) {
      return [];
    }
    return required.filter((permission) => !ent.permissions.includes(permission));
  }

  private logDenied(userId: string, request: GuardedRequest, required: Permission[]): void {
    const ua = request.headers?.['user-agent'];
    this.logger.warn(
      `permission denied user=${userId} ${request.method ?? '?'} ${request.url ?? '?'} ` +
        `required=[${required.join(',')}] ip=${request.ip ?? '?'} ua=${typeof ua === 'string' ? ua : '?'}`,
    );
  }
}
