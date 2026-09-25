import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';

import {
  ORGANIZATION_ADMINISTRATOR_ROLES,
  ORGANIZATION_NOT_FOUND_MESSAGE,
} from '../constants/organization-access.constants';
import { OrganizationRepository } from '../repositories/organization.repository';
import type { OrganizationMember } from '../../../generated/prisma';

/**
 * The one place a coding-agent organization decides who may touch it
 * (REQ-SEC-001 / SEC-005).
 *
 * Every read of an organization's data needs membership; every mutation needs
 * an OWNER or ADMIN of THAT organization. The check is made against the
 * caller's own membership row, looked up by (organizationId, callerId), so a
 * path parameter is never trusted on its own.
 *
 * Platform RBAC roles do not reach in here: a platform ADMIN who is not a
 * member is an outsider like anyone else. There is no org-administration
 * permission in the catalog, and granting one silently would be a
 * cross-tenant power no one decided on.
 */
@Injectable()
export class OrganizationAccessService {
  constructor(private readonly repo: OrganizationRepository) {}

  /** The caller's membership, or 404 — a stranger must not learn the org exists. */
  async requireMember(organizationId: string, userId: string): Promise<OrganizationMember> {
    const membership = await this.repo.findMembershipForUser(organizationId, userId);
    if (membership === null) throw new NotFoundException(ORGANIZATION_NOT_FOUND_MESSAGE);
    return membership;
  }

  /** A member who is not OWNER/ADMIN already knows the org exists, so 403. */
  async requireAdministrator(organizationId: string, userId: string): Promise<OrganizationMember> {
    const membership = await this.requireMember(organizationId, userId);
    if (!ORGANIZATION_ADMINISTRATOR_ROLES.includes(membership.role)) {
      throw new ForbiddenException('Only an owner or admin may administer this organization');
    }
    return membership;
  }
}
