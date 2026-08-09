import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { UserRole } from '../../common/enums';
import { AuthenticatedRequest } from '../../common/types';
import { type Permission } from '@claw/shared-types';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';
import { RolesService } from '../../modules/roles/services/roles.service';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly rolesService: RolesService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[] | undefined>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    const requiredPermissions = this.reflector.getAllAndOverride<Permission[] | undefined>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    if ((!requiredRoles || requiredRoles.length === 0) && !requiredPermissions?.length) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const user = request.user;

    if (!user) {
      return false;
    }

    const roleAllowed = !requiredRoles?.length || requiredRoles.includes(user.role);
    const effectivePermissions = requiredPermissions?.length
      ? await this.rolesService.resolvePermissionsBySlug(user.role)
      : [];
    const permissionsAllowed =
      !requiredPermissions?.length ||
      requiredPermissions.every((permission) => effectivePermissions.includes(permission));
    return roleAllowed && permissionsAllowed;
  }
}
