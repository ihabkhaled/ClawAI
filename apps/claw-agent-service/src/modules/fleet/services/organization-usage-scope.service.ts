import { Injectable } from '@nestjs/common';

import { OrganizationRepository } from '../repositories/organization.repository';
import { OrganizationAccessService } from './organization-access.service';
import type { OrganizationUsageScope } from '../types/organization-usage-scope.types';

/**
 * The member list an organization usage aggregate may read (F108).
 *
 * The administrator check lives here, with the rows it is about: a stranger
 * gets 404 and a plain member 403, exactly as on the device matrix, before a
 * single member id leaves this service.
 */
@Injectable()
export class OrganizationUsageScopeService {
  constructor(
    private readonly repo: OrganizationRepository,
    private readonly access: OrganizationAccessService,
  ) {}

  async forAdministrator(
    organizationId: string,
    requesterId: string,
  ): Promise<OrganizationUsageScope> {
    await this.access.requireAdministrator(organizationId, requesterId);
    const members = await this.repo.listMembers(organizationId);
    return { organizationId, memberUserIds: members.map((member) => member.userId) };
  }
}
