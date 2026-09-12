import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import type { DeviceMatrixRow } from '../types/device-matrix.types';
import type {
  Organization,
  OrganizationMember,
  OrganizationPolicy,
  Prisma,
} from '../../../generated/prisma';

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

  async addMember(data: Prisma.OrganizationMemberCreateInput): Promise<OrganizationMember> {
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

  async findPolicy(organizationId: string): Promise<OrganizationPolicy | null> {
    return this.prisma.organizationPolicy.findUnique({ where: { organizationId } });
  }

  /**
   * One policy per organization, created on first write.
   *
   * An upsert rather than create-then-update so an administrator saving a
   * policy for the first time and saving it again take the same path, and so
   * two concurrent saves cannot race into a duplicate row the unique index
   * would then reject.
   */
  async upsertPolicy(
    organizationId: string,
    data: Omit<Prisma.OrganizationPolicyCreateInput, 'organization'>,
  ): Promise<OrganizationPolicy> {
    return this.prisma.organizationPolicy.upsert({
      where: { organizationId },
      create: { ...data, organization: { connect: { id: organizationId } } },
      update: data,
    });
  }

  /**
   * The policies of every organization the user belongs to.
   *
   * A user can be in more than one, and the client is given the intersection
   * rather than a choice: belonging to a permissive organization must not
   * loosen what a stricter one imposes.
   */
  async listPoliciesForUser(userId: string): Promise<OrganizationPolicy[]> {
    return this.prisma.organizationPolicy.findMany({
      where: { organization: { members: { some: { userId } } } },
    });
  }

  async updateMetadata(id: string, data: Prisma.OrganizationUpdateInput): Promise<Organization> {
    return this.prisma.organization.update({ where: { id }, data });
  }

  // V2 Stream 07 — device matrix.
  //
  // Joins org -> members -> devices and projects a small row per device
  // so the fleet governance UI can render a table without N+1 queries.
  // Includes a denormalised PENDING capability count via a correlated
  // subquery — small org sizes (~100 devices) keep this <50ms in
  // production.
  async listDevicesForOrganization(organizationId: string): Promise<DeviceMatrixRow[]> {
    return (await this.prisma.$queryRaw`
      SELECT
        d."id"            AS "deviceId",
        d."name"          AS "deviceName",
        d."userId"        AS "userId",
        d."os"            AS "os",
        d."platform"      AS "platform",
        d."agentVersion"  AS "agentVersion",
        d."status"        AS "status",
        d."lastSeenAt"    AS "lastSeenAt",
        (
          SELECT COUNT(*)::int
          FROM "CapabilityInvocation" ci
          WHERE ci."deviceId" = d."id"
            AND ci."status" = 'PENDING_APPROVAL'
        ) AS "pendingCapabilities"
      FROM "Device" d
      JOIN "organization_members" om ON om."userId" = d."userId"
      WHERE om."organizationId" = ${organizationId}
      ORDER BY d."lastSeenAt" DESC NULLS LAST
    `) as DeviceMatrixRow[];
  }
}
