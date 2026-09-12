import { ForbiddenException, NotFoundException } from '@nestjs/common';

import { OrganizationPolicyService } from '../organization-policy.service';
import { UNCONSTRAINED_POLICY } from '../../constants/organization-policy.constants';

import { OrganizationRole } from '../../../../generated/prisma';
import type { OrganizationRepository } from '../../repositories/organization.repository';

function repository(overrides: Partial<OrganizationRepository> = {}): OrganizationRepository {
  return {
    listPoliciesForUser: jest.fn().mockResolvedValue([]),
    findPolicy: jest.fn().mockResolvedValue(null),
    upsertPolicy: jest.fn(),
    findMembershipForUser: jest.fn().mockResolvedValue({ role: OrganizationRole.ADMIN }),
    ...overrides,
  } as unknown as OrganizationRepository;
}

const storedPolicy = {
  allowedTools: ['workspace.files'],
  allowedModels: [],
  maximumRisk: 'R2',
  deniedEffects: ['publication'],
  requireApproval: [],
  maximumRetentionDays: 30,
  minimumPermissionMode: 'ASK',
};

describe('OrganizationPolicyService', () => {
  describe('effectiveForUser', () => {
    it('leaves a user in no organization unconstrained', async () => {
      const service = new OrganizationPolicyService(repository());

      await expect(service.effectiveForUser('user-1')).resolves.toEqual(UNCONSTRAINED_POLICY);
    });

    it('intersects every organization the user belongs to', async () => {
      const service = new OrganizationPolicyService(
        repository({
          listPoliciesForUser: jest.fn().mockResolvedValue([
            { ...storedPolicy, maximumRisk: 'R4' },
            { ...storedPolicy, maximumRisk: 'R1' },
          ]),
        }),
      );

      await expect(service.effectiveForUser('user-1')).resolves.toMatchObject({
        maximumRisk: 'R1',
      });
    });

    // A client does not know which organizations its user belongs to, and a
    // member of two must not learn one's policy from the other's.
    it('never names the organization that imposed a constraint', async () => {
      const service = new OrganizationPolicyService(
        repository({
          listPoliciesForUser: jest
            .fn()
            .mockResolvedValue([{ ...storedPolicy, id: 'p1', organizationId: 'org-secret' }]),
        }),
      );

      const effective = await service.effectiveForUser('user-1');

      expect(JSON.stringify(effective)).not.toContain('org-secret');
      expect(effective).not.toHaveProperty('organizationId');
      expect(effective).not.toHaveProperty('id');
    });
  });

  describe('forOrganization', () => {
    // A member is entitled to know the rules they are held to.
    it('lets a plain member read the policy', async () => {
      const service = new OrganizationPolicyService(
        repository({
          findMembershipForUser: jest.fn().mockResolvedValue({ role: OrganizationRole.MEMBER }),
          findPolicy: jest.fn().mockResolvedValue(storedPolicy),
        }),
      );

      await expect(service.forOrganization('org-1', 'user-1')).resolves.toMatchObject({
        maximumRisk: 'R2',
      });
    });

    // Telling a non-member that an organization exists is itself a disclosure.
    it('reports not found rather than forbidden to a non-member', async () => {
      const service = new OrganizationPolicyService(
        repository({ findMembershipForUser: jest.fn().mockResolvedValue(null) }),
      );

      await expect(service.forOrganization('org-1', 'outsider')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('returns the unconstrained policy when none has been set', async () => {
      const service = new OrganizationPolicyService(repository());

      await expect(service.forOrganization('org-1', 'user-1')).resolves.toEqual(
        UNCONSTRAINED_POLICY,
      );
    });
  });

  describe('update', () => {
    it('lets an owner or admin save a policy', async () => {
      const upsertPolicy = jest.fn().mockResolvedValue(storedPolicy);
      const service = new OrganizationPolicyService(
        repository({
          findMembershipForUser: jest.fn().mockResolvedValue({ role: OrganizationRole.OWNER }),
          upsertPolicy,
        }),
      );

      await service.update('org-1', 'user-1', {
        allowedTools: ['workspace.files'],
        allowedModels: [],
        maximumRisk: 'R2',
        deniedEffects: ['publication'],
        requireApproval: [],
        maximumRetentionDays: 30,
        minimumPermissionMode: 'ASK',
      });

      expect(upsertPolicy).toHaveBeenCalledWith(
        'org-1',
        expect.objectContaining({ maximumRisk: 'R2' }),
      );
    });

    // Writing a policy is administrative; reading it is not.
    it('refuses a plain member', async () => {
      const upsertPolicy = jest.fn();
      const service = new OrganizationPolicyService(
        repository({
          findMembershipForUser: jest.fn().mockResolvedValue({ role: OrganizationRole.MEMBER }),
          upsertPolicy,
        }),
      );

      await expect(
        service.update('org-1', 'user-1', {
          allowedTools: [],
          allowedModels: [],
          maximumRisk: 'R4',
          deniedEffects: [],
          requireApproval: [],
          maximumRetentionDays: 3_650,
          minimumPermissionMode: null,
        }),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(upsertPolicy).not.toHaveBeenCalled();
    });
  });
});
