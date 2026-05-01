import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import type { Organization, OrganizationMember, Prisma } from '../../../generated/prisma';

@Injectable()
export class OrganizationRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: Prisma.OrganizationCreateInput): Promise<Organization> {
    return this.prisma.organization.create({ data });
  }

  async findById(id: string): Promise<Organization | null> {
    return this.prisma.organization.findUnique({ where: { id } });
  }

  async findBySlug(slug: string): Promise<Organization | null> {
    return this.prisma.organization.findUnique({ where: { slug } });
  }

  async addMember(
    data: Prisma.OrganizationMemberCreateInput,
  ): Promise<OrganizationMember> {
    return this.prisma.organizationMember.create({ data });
  }

  async listMembers(organizationId: string): Promise<OrganizationMember[]> {
    return this.prisma.organizationMember.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async findMembershipForUser(
    organizationId: string,
    userId: string,
  ): Promise<OrganizationMember | null> {
    return this.prisma.organizationMember.findUnique({
      where: { organizationId_userId: { organizationId, userId } },
    });
  }

  async listOrganizationsForUser(userId: string): Promise<Organization[]> {
    const memberships = await this.prisma.organizationMember.findMany({
      where: { userId },
      include: { organization: true },
    });
    return memberships.map((m) => m.organization);
  }

  async updateMetadata(
    id: string,
    data: Prisma.OrganizationUpdateInput,
  ): Promise<Organization> {
    return this.prisma.organization.update({ where: { id }, data });
  }
}
