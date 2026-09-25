import { ConflictException, ForbiddenException, Injectable } from '@nestjs/common';

import { OWNER_ONLY_GRANTABLE_ROLES } from '../constants/organization-access.constants';
import { OrganizationRepository } from '../repositories/organization.repository';
import { OrganizationAccessService } from './organization-access.service';
import {
  type Organization,
  type OrganizationMember,
  OrganizationRole,
} from '../../../generated/prisma';
import type { AddMemberDto, CreateOrganizationDto } from '../dto/organization.dto';
import type { DeviceMatrixRow } from '../types/device-matrix.types';

/**
 * Organization lifecycle and membership, with the access check made here in
 * the service rather than trusted from the route (rules/16 §6).
 */
@Injectable()
export class OrganizationMembershipService {
  constructor(
    private readonly repo: OrganizationRepository,
    private readonly access: OrganizationAccessService,
  ) {}

  /** Creates the organization and its first OWNER in one write. */
  async create(userId: string, dto: CreateOrganizationDto): Promise<Organization> {
    return this.repo.createWithOwner(
      { name: dto.name, slug: dto.slug, ssoEnabled: dto.ssoEnabled },
      userId,
    );
  }

  async listForUser(userId: string): Promise<Organization[]> {
    return this.repo.listOrganizationsForUser(userId);
  }

  async listMembers(organizationId: string, userId: string): Promise<OrganizationMember[]> {
    await this.access.requireMember(organizationId, userId);
    return this.repo.listMembers(organizationId);
  }

  /**
   * Every member's devices. An administrative view: a plain member is not
   * entitled to their colleagues' machines, last-seen times and queues.
   */
  async listDevices(organizationId: string, userId: string): Promise<DeviceMatrixRow[]> {
    await this.access.requireAdministrator(organizationId, userId);
    return this.repo.listDevicesForOrganization(organizationId);
  }

  /**
   * Adds a member. Only an OWNER may grant OWNER, so an ADMIN cannot mint a
   * rank above their own — including for themselves. An existing member gets
   * 409 rather than a silent role change: this endpoint adds, it never
   * re-ranks, which is what closes the "re-add myself as OWNER" path.
   */
  async addMember(
    organizationId: string,
    userId: string,
    dto: AddMemberDto,
  ): Promise<OrganizationMember> {
    const caller = await this.access.requireAdministrator(organizationId, userId);
    if (OWNER_ONLY_GRANTABLE_ROLES.includes(dto.role) && caller.role !== OrganizationRole.OWNER) {
      throw new ForbiddenException('Only an owner may grant the owner role');
    }
    const existing = await this.repo.findMembershipForUser(organizationId, dto.userId);
    if (existing !== null) {
      throw new ConflictException('That user is already a member of this organization');
    }
    return this.repo.addMember({
      organization: { connect: { id: organizationId } },
      userId: dto.userId,
      role: dto.role,
    });
  }
}
