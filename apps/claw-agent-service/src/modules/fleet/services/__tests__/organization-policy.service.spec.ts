import { vi } from 'vitest';
import { ForbiddenException, NotFoundException } from '@nestjs/common';

import { OrganizationAccessService } from '../organization-access.service';
import { OrganizationPolicyService } from '../organization-policy.service';
import { UNCONSTRAINED_POLICY } from '../../constants/organization-policy.constants';

import { OrganizationRole, Prisma } from '../../../../generated/prisma';
import type { OrganizationRepository } from '../../repositories/organization.repository';

function repository(overrides: Partial<OrganizationRepository> = {}): OrganizationRepository {
  return {
    listPoliciesForUser: vi.fn().mockResolvedValue([]),
    findPolicy: vi.fn().mockResolvedValue(null),
    upsertPolicy: vi.fn(),
    findMembershipForUser: vi.fn().mockResolvedValue({ role: OrganizationRole.ADMIN }),
    ...overrides,
  } as unknown as OrganizationRepository;
}

function policyService(repo: OrganizationRepository): OrganizationPolicyService {
  return new OrganizationPolicyService(repo, new OrganizationAccessService(repo));
}

const storedPolicy = {
  allowedTools: ['workspace.files'],
  allowedModels: [],
  maximumRisk: 'R2',
  deniedEffects: ['publication'],
  requireApproval: [],
  maximumRetentionDays: 30,
  minimumPermissionMode: 'ASK',
  rules: [],
  trust: { repositories: [], domains: [], commands: [] },
  mcpServers: { allow: [], deny: [] },
};

const noGuardrails = {
  rules: [],
  trust: { repositories: [], domains: [], commands: [] },
  mcpServers: { allow: [], deny: [] },
  allowedPluginMarketplaces: null,
  minRunnerVersion: null,
  allowedRunnerPlatforms: null,
  runnerPolicyMode: 'off' as const,
  requireVersionReport: false,
};

describe('OrganizationPolicyService', () => {
  describe('effectiveForUser', () => {
    it('leaves a user in no organization unconstrained', async () => {
      const service = policyService(repository());

      await expect(service.effectiveForUser('user-1')).resolves.toEqual(UNCONSTRAINED_POLICY);
    });

    it('intersects every organization the user belongs to', async () => {
      const service = policyService(
        repository({
          listPoliciesForUser: vi.fn().mockResolvedValue([
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
      const service = policyService(
        repository({
          listPoliciesForUser: vi
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
      const service = policyService(
        repository({
          findMembershipForUser: vi.fn().mockResolvedValue({ role: OrganizationRole.MEMBER }),
          findPolicy: vi.fn().mockResolvedValue(storedPolicy),
        }),
      );

      await expect(service.forOrganization('org-1', 'user-1')).resolves.toMatchObject({
        maximumRisk: 'R2',
      });
    });

    // Telling a non-member that an organization exists is itself a disclosure.
    it('reports not found rather than forbidden to a non-member', async () => {
      const service = policyService(
        repository({ findMembershipForUser: vi.fn().mockResolvedValue(null) }),
      );

      await expect(service.forOrganization('org-1', 'outsider')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('returns the unconstrained policy when none has been set', async () => {
      const service = policyService(repository());

      await expect(service.forOrganization('org-1', 'user-1')).resolves.toEqual(
        UNCONSTRAINED_POLICY,
      );
    });
  });

  describe('update', () => {
    it('lets an owner or admin save a policy', async () => {
      const upsertPolicy = vi.fn().mockResolvedValue(storedPolicy);
      const service = policyService(
        repository({
          findMembershipForUser: vi.fn().mockResolvedValue({ role: OrganizationRole.OWNER }),
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
        ...noGuardrails,
      });

      expect(upsertPolicy).toHaveBeenCalledWith(
        'org-1',
        expect.objectContaining({ maximumRisk: 'R2' }),
      );
    });

    it('stores the plugin marketplace list, and clears it to NULL (no opinion) when null', async () => {
      const upsertPolicy = vi.fn().mockResolvedValue(storedPolicy);
      const service = policyService(repository({ upsertPolicy }));
      const base = {
        allowedTools: [],
        allowedModels: [],
        maximumRisk: 'R4' as const,
        deniedEffects: [],
        requireApproval: [],
        maximumRetentionDays: 30,
        minimumPermissionMode: null,
        ...noGuardrails,
      };

      await service.update('org-1', 'user-1', {
        ...base,
        allowedPluginMarketplaces: ['https://m.example'],
      });
      await service.update('org-1', 'user-1', base);

      expect(upsertPolicy.mock.calls[0]?.[1]).toMatchObject({
        allowedPluginMarketplaces: ['https://m.example'],
      });
      expect(upsertPolicy.mock.calls[1]?.[1]).toMatchObject({
        allowedPluginMarketplaces: Prisma.DbNull,
      });
    });

    // Writing a policy is administrative; reading it is not.
    it('refuses a plain member', async () => {
      const upsertPolicy = vi.fn();
      const service = policyService(
        repository({
          findMembershipForUser: vi.fn().mockResolvedValue({ role: OrganizationRole.MEMBER }),
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
          ...noGuardrails,
        }),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(upsertPolicy).not.toHaveBeenCalled();
    });
  });
});

describe('OrganizationPolicyService: runner policy (F100)', () => {
  const base = {
    allowedTools: [],
    allowedModels: [],
    maximumRisk: 'R4' as const,
    deniedEffects: [],
    requireApproval: [],
    maximumRetentionDays: 3_650,
    minimumPermissionMode: null,
    ...noGuardrails,
  };

  it('stores the runner fields and clears the platform list to NULL when null', async () => {
    const upsertPolicy = vi.fn().mockResolvedValue(storedPolicy);
    const service = policyService(repository({ upsertPolicy }));

    await service.update('org-1', 'user-1', {
      ...base,
      minRunnerVersion: '1.90.0',
      allowedRunnerPlatforms: ['linux'],
      runnerPolicyMode: 'report',
      requireVersionReport: true,
    });
    await service.update('org-1', 'user-1', base);

    expect(upsertPolicy.mock.calls[0]?.[1]).toMatchObject({
      minRunnerVersion: '1.90.0',
      allowedRunnerPlatforms: ['linux'],
      runnerPolicyMode: 'report',
      requireVersionReport: true,
    });
    expect(upsertPolicy.mock.calls[1]?.[1]).toMatchObject({
      minRunnerVersion: null,
      allowedRunnerPlatforms: Prisma.DbNull,
      runnerPolicyMode: 'off',
      requireVersionReport: false,
    });
  });

  it('only an owner or admin may edit it: a plain member is refused and nothing is written', async () => {
    const upsertPolicy = vi.fn();
    const service = policyService(
      repository({
        findMembershipForUser: vi.fn().mockResolvedValue({ role: OrganizationRole.MEMBER }),
        upsertPolicy,
      }),
    );

    await expect(
      service.update('org-1', 'user-1', { ...base, runnerPolicyMode: 'enforce' }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(upsertPolicy).not.toHaveBeenCalled();
  });

  it('never puts the runner policy in the payload the extension parses strictly', async () => {
    const upsertPolicy = vi.fn().mockResolvedValue({
      ...storedPolicy,
      minRunnerVersion: '1.90.0',
      runnerPolicyMode: 'enforce',
    });
    const service = policyService(repository({ upsertPolicy }));

    const result = await service.update('org-1', 'user-1', base);

    expect(Object.keys(result)).not.toEqual(
      expect.arrayContaining(['minRunnerVersion', 'runnerPolicyMode']),
    );
    expect(JSON.stringify(result)).not.toContain('1.90.0');
  });

  it('lets a member read the runner policy and reports an organization without one as inert', async () => {
    const stored = {
      ...storedPolicy,
      minRunnerVersion: '1.90.0',
      allowedRunnerPlatforms: ['linux'],
      runnerPolicyMode: 'enforce',
      requireVersionReport: true,
    };
    const member = policyService(
      repository({
        findMembershipForUser: vi.fn().mockResolvedValue({ role: OrganizationRole.MEMBER }),
        findPolicy: vi.fn().mockResolvedValue(stored),
      }),
    );
    await expect(member.runnerPolicyForOrganization('org-1', 'user-1')).resolves.toEqual({
      minRunnerVersion: '1.90.0',
      allowedRunnerPlatforms: ['linux'],
      runnerPolicyMode: 'enforce',
      requireVersionReport: true,
    });

    await expect(
      policyService(repository()).runnerPolicyForOrganization('org-1', 'user-1'),
    ).resolves.toEqual({
      minRunnerVersion: null,
      allowedRunnerPlatforms: null,
      runnerPolicyMode: 'off',
      requireVersionReport: false,
    });
  });

  it("answers 404 for another organization's runner policy (IDOR)", async () => {
    const findPolicy = vi.fn();
    const service = policyService(
      repository({ findMembershipForUser: vi.fn().mockResolvedValue(null), findPolicy }),
    );

    await expect(service.runnerPolicyForOrganization('org-x', 'user-1')).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(findPolicy).not.toHaveBeenCalled();
  });
});
