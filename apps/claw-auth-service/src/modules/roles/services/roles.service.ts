import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { Permission, UserRole } from '@claw/shared-types';
import { BusinessException, EntityNotFoundException } from '../../../common/errors';
import { type Role } from '../../../generated/prisma';
import { RolesRepository } from '../repositories/roles.repository';
import {
  type CreateRoleData,
  type RoleWithPermissions,
  type UpdateRoleData,
} from '../types/roles.types';
import {
  SUPER_ADMIN_REFUSED_ACTOR_ACTION,
  SUPER_ADMIN_REQUIRED_CODE,
  SUPER_ADMIN_REQUIRED_MESSAGE,
} from '../../../common/constants/super-admin.constants';

@Injectable()
export class RolesService {
  private readonly logger = new Logger(RolesService.name);

  constructor(private readonly rolesRepository: RolesRepository) {}

  async listRoles(): Promise<RoleWithPermissions[]> {
    const roles = await this.rolesRepository.findAll();
    return roles.map((role) => this.toView(role));
  }

  async getRole(id: string): Promise<RoleWithPermissions> {
    const role = await this.rolesRepository.findById(id);
    if (!role) {
      throw new EntityNotFoundException('Role', id);
    }
    return this.toView(role);
  }

  // Resolves the effective permission set for a role slug. Used by login,
  // /auth/me and the entitlements endpoint. Unknown/missing slug → no perms.
  async resolvePermissionsBySlug(slug: string): Promise<Permission[]> {
    const role = await this.rolesRepository.findBySlug(slug);
    if (!role) {
      this.logger.warn(`resolvePermissionsBySlug: no role for slug=${slug}`);
      return [];
    }
    return this.extractPermissions(role.permissions);
  }

  // Resolves permissions for a user. Prefers the DB roleId; falls back to the
  // legacy role enum mapped to a system-role slug (ADMIN→ADMIN, anything else
  // →USER) so pre-flagship users without a roleId still get sane permissions.
  async resolvePermissionsForUser(
    roleId: string | null,
    legacyRole: string,
  ): Promise<Permission[]> {
    if (roleId) {
      const role = await this.rolesRepository.findById(roleId);
      if (role) {
        return this.extractPermissions(role.permissions);
      }
    }
    const fallbackSlug = legacyRole === UserRole.ADMIN ? UserRole.ADMIN : UserRole.USER;
    return this.resolvePermissionsBySlug(fallbackSlug);
  }

  // Returns the USER system role id, used as the default for registration.
  async getDefaultUserRoleId(): Promise<string | null> {
    const role = await this.rolesRepository.findBySlug(UserRole.USER);
    return role?.id ?? null;
  }

  // Returns the system role id matching a legacy role slug, so an
  // administrator-created account gets the same roleRef self-registration does
  // instead of being born with none.
  async getRoleIdBySlug(slug: string): Promise<string | null> {
    const role = await this.rolesRepository.findBySlug(slug);
    return role?.id ?? null;
  }

  async createRole(data: CreateRoleData): Promise<RoleWithPermissions> {
    const existing = await this.rolesRepository.findBySlug(data.slug);
    if (existing) {
      throw new BusinessException(
        'Role slug already exists',
        'ROLE_SLUG_TAKEN',
        HttpStatus.CONFLICT,
      );
    }
    this.logger.log(`createRole: slug=${data.slug} perms=${data.permissions.length}`);
    const role = await this.rolesRepository.create(data);
    return this.toView(role);
  }

  async updateRole(id: string, data: UpdateRoleData): Promise<RoleWithPermissions> {
    await this.getRole(id);
    const updated = await this.rolesRepository.update(id, data);
    this.logger.log(`updateRole: id=${id}`);
    return this.toView(updated);
  }

  async deleteRole(id: string): Promise<void> {
    const role = await this.getRole(id);
    if (role.isSystem) {
      throw new BusinessException(
        'System roles cannot be deleted',
        'ROLE_SYSTEM_PROTECTED',
        HttpStatus.FORBIDDEN,
      );
    }
    const userCount = await this.rolesRepository.countUsersWithRole(id);
    if (userCount > 0) {
      throw new BusinessException(
        'Cannot delete a role that is still assigned to users',
        'ROLE_HAS_USERS',
        HttpStatus.CONFLICT,
      );
    }
    await this.rolesRepository.delete(id);
    this.logger.log(`deleteRole: id=${id}`);
  }

  async setPermissions(
    id: string,
    permissions: Permission[],
    actorId: string,
  ): Promise<RoleWithPermissions> {
    const role = await this.getRole(id);
    // A system role's grant set is what the super administrator's own authority
    // is made of. Leaving this on the ADMIN role enum alone let one administrator
    // degrade every administrator — an attack on the super administrator that
    // never touches the super administrator's user row.
    await this.assertSuperAdminActorForSystemRole(role.isSystem, actorId);
    this.assertNoAdminLockout(role.slug, permissions);
    const updated = await this.rolesRepository.replacePermissions(id, permissions);
    if (!updated) {
      throw new EntityNotFoundException('Role', id);
    }
    this.logger.log(`setPermissions: id=${id} count=${permissions.length}`);
    return this.toView(updated);
  }

  private async assertSuperAdminActorForSystemRole(
    isSystem: boolean,
    actorId: string,
  ): Promise<void> {
    if (!isSystem) return;
    if (await this.rolesRepository.isSuperAdminActor(actorId)) return;
    this.logger.warn(
      `${SUPER_ADMIN_REFUSED_ACTOR_ACTION}: actor=${actorId} attempted a system-role permission change`,
    );
    throw new BusinessException(
      SUPER_ADMIN_REQUIRED_MESSAGE,
      SUPER_ADMIN_REQUIRED_CODE,
      HttpStatus.FORBIDDEN,
    );
  }

  // Refuse to strip the ADMIN system role of ADMIN_PERMISSIONS_MANAGE — that
  // would lock every admin out of role management permanently.
  private assertNoAdminLockout(slug: string, permissions: Permission[]): void {
    if (slug === UserRole.ADMIN && !permissions.includes(Permission.ADMIN_PERMISSIONS_MANAGE)) {
      throw new BusinessException(
        'The ADMIN role must retain ADMIN_PERMISSIONS_MANAGE',
        'ROLE_ADMIN_LOCKOUT',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  private extractPermissions(rows: { permission: string }[]): Permission[] {
    const valid = new Set<string>(Object.values(Permission));
    return rows.map((r) => r.permission).filter((p): p is Permission => valid.has(p));
  }

  private toView(role: Role & { permissions: { permission: string }[] }): RoleWithPermissions {
    return {
      id: role.id,
      slug: role.slug,
      name: role.name,
      description: role.description,
      isSystem: role.isSystem,
      isAssignable: role.isAssignable,
      permissions: this.extractPermissions(role.permissions),
      createdAt: role.createdAt,
      updatedAt: role.updatedAt,
    };
  }
}
