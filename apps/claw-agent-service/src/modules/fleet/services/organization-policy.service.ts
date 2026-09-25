import { Injectable } from '@nestjs/common';

import { UNCONSTRAINED_POLICY } from '../constants/organization-policy.constants';
import { OrganizationRepository } from '../repositories/organization.repository';
import { OrganizationAccessService } from './organization-access.service';
import { intersectPolicies, toEffectivePolicy } from '../utilities/policy-intersection.utility';

import type { UpdateOrganizationPolicyDto } from '../dto/organization-policy.dto';
import type { EffectivePolicy } from '../types/organization-policy.types';

@Injectable()
export class OrganizationPolicyService {
  constructor(
    private readonly repo: OrganizationRepository,
    private readonly access: OrganizationAccessService,
  ) {}

  /**
   * What the caller's client must obey, across every organization they are in.
   *
   * Ownership is not checked because there is nothing to own: the answer is
   * derived from the caller's own memberships and constrains only them. It also
   * never names the organization that imposed a constraint, so a member of two
   * organizations cannot learn one's policy from the other's.
   */
  async effectiveForUser(userId: string): Promise<EffectivePolicy> {
    const policies = await this.repo.listPoliciesForUser(userId);
    return policies.length === 0 ? UNCONSTRAINED_POLICY : intersectPolicies(policies.map(toEffectivePolicy));
  }

  async forOrganization(organizationId: string, userId: string): Promise<EffectivePolicy> {
    await this.access.requireMember(organizationId, userId);
    const policy = await this.repo.findPolicy(organizationId);
    return policy === null ? UNCONSTRAINED_POLICY : toEffectivePolicy(policy);
  }

  /**
   * Writing a policy is an administrative act, so it needs a role rather than
   * membership. Reading the organization's own policy needs only membership:
   * a member is entitled to know the rules they are being held to.
   */
  async update(
    organizationId: string,
    userId: string,
    dto: UpdateOrganizationPolicyDto,
  ): Promise<EffectivePolicy> {
    await this.access.requireAdministrator(organizationId, userId);
    const saved = await this.repo.upsertPolicy(organizationId, {
      allowedTools: [...dto.allowedTools],
      allowedModels: [...dto.allowedModels],
      maximumRisk: dto.maximumRisk,
      deniedEffects: [...dto.deniedEffects],
      requireApproval: [...dto.requireApproval],
      maximumRetentionDays: dto.maximumRetentionDays,
      minimumPermissionMode: dto.minimumPermissionMode,
    });
    return toEffectivePolicy(saved);
  }
}
