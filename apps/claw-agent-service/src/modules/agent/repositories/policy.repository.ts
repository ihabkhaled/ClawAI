import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import type { AccessPolicy, Prisma } from '../../../generated/prisma';

@Injectable()
export class PolicyRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: Prisma.AccessPolicyCreateInput): Promise<AccessPolicy> {
    return this.prisma.accessPolicy.create({ data });
  }

  async upsertByName(name: string, data: Prisma.AccessPolicyCreateInput): Promise<AccessPolicy> {
    const existing = await this.prisma.accessPolicy.findFirst({ where: { name, orgId: null } });
    if (existing === null) {
      return this.prisma.accessPolicy.create({ data });
    }
    return this.prisma.accessPolicy.update({ where: { id: existing.id }, data });
  }

  async findActive(): Promise<AccessPolicy[]> {
    return this.prisma.accessPolicy.findMany({
      where: { isActive: true },
      orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }],
    });
  }

  /**
   * Active policies that explicitly target the supplied capability class.
   * Used by CapabilityRiskService.
   *
   * Legacy terminal-command policies (capabilityClass=null) are excluded —
   * those live exclusively in the CommandRiskService path. The capability
   * framework reads only class-tagged rows. See ADR-029.
   */
  async findActiveForCapabilityClass(
    capabilityClass: string,
    orgIds: string[] = [],
  ): Promise<AccessPolicy[]> {
    return this.prisma.accessPolicy.findMany({
      where: {
        isActive: true,
        capabilityClass: capabilityClass as never,
        OR: [{ orgId: null }, { orgId: { in: orgIds } }],
      },
      orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }],
    });
  }

  /**
   * Resolve the orgs a user is a member of. Used by the risk service to
   * scope policy lookups (Stream 40 RBAC).
   */
  async findOrgIdsForUser(userId: string): Promise<string[]> {
    const memberships = await this.prisma.organizationMember.findMany({
      where: { userId },
      select: { organizationId: true },
    });
    return memberships.map((m) => m.organizationId);
  }

  async findById(id: string): Promise<AccessPolicy | null> {
    return this.prisma.accessPolicy.findUnique({ where: { id } });
  }

  async list(): Promise<AccessPolicy[]> {
    return this.prisma.accessPolicy.findMany({
      orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }],
    });
  }

  async setActive(id: string, isActive: boolean): Promise<AccessPolicy> {
    return this.prisma.accessPolicy.update({ where: { id }, data: { isActive } });
  }

  async deleteById(id: string): Promise<void> {
    await this.prisma.accessPolicy.delete({ where: { id } });
  }
}
