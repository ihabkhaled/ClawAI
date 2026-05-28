import { Injectable } from '@nestjs/common';
import { type Permission } from '@claw/shared-types';
import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import { type Role } from '../../../generated/prisma';
import { type CreateRoleData, type UpdateRoleData } from '../types/roles.types';

@Injectable()
export class RolesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(): Promise<Array<Role & { permissions: { permission: string }[] }>> {
    return this.prisma.role.findMany({
      include: { permissions: { select: { permission: true } } },
      orderBy: { createdAt: 'asc' },
    });
  }

  async findById(id: string): Promise<(Role & { permissions: { permission: string }[] }) | null> {
    return this.prisma.role.findUnique({
      where: { id },
      include: { permissions: { select: { permission: true } } },
    });
  }

  async findBySlug(
    slug: string,
  ): Promise<(Role & { permissions: { permission: string }[] }) | null> {
    return this.prisma.role.findUnique({
      where: { slug },
      include: { permissions: { select: { permission: true } } },
    });
  }

  async create(data: CreateRoleData): Promise<Role & { permissions: { permission: string }[] }> {
    return this.prisma.role.create({
      data: {
        slug: data.slug,
        name: data.name,
        description: data.description,
        isAssignable: data.isAssignable,
        isSystem: false,
        permissions: { create: data.permissions.map((permission) => ({ permission })) },
      },
      include: { permissions: { select: { permission: true } } },
    });
  }

  async update(
    id: string,
    data: UpdateRoleData,
  ): Promise<Role & { permissions: { permission: string }[] }> {
    return this.prisma.role.update({
      where: { id },
      data: {
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.description !== undefined ? { description: data.description } : {}),
        ...(data.isAssignable !== undefined ? { isAssignable: data.isAssignable } : {}),
      },
      include: { permissions: { select: { permission: true } } },
    });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.role.delete({ where: { id } });
  }

  // Atomically replace a role's permission grants with the supplied set.
  // Returns the refreshed role (or null if it no longer exists) — the service
  // decides how to react.
  async replacePermissions(
    id: string,
    permissions: Permission[],
  ): Promise<(Role & { permissions: { permission: string }[] }) | null> {
    await this.prisma.$transaction([
      this.prisma.rolePermission.deleteMany({ where: { roleId: id } }),
      this.prisma.rolePermission.createMany({
        data: permissions.map((permission) => ({ roleId: id, permission })),
        skipDuplicates: true,
      }),
    ]);
    return this.findById(id);
  }

  async countUsersWithRole(roleId: string): Promise<number> {
    return this.prisma.user.count({ where: { roleId } });
  }
}
