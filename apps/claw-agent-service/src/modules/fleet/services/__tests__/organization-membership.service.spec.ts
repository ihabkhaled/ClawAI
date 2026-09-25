import { vi } from 'vitest';
import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';

import { OrganizationAccessService } from '../organization-access.service';
import { OrganizationMembershipService } from '../organization-membership.service';

import { OrganizationRole } from '../../../../generated/prisma';
import type { OrganizationRepository } from '../../repositories/organization.repository';

const ORG = 'org-1';
const CALLER = 'caller-1';
const TARGET = 'ckv0target0000000000000000';

type Memberships = Record<string, OrganizationRole>;

/** A repository whose membership table is exactly `memberships` for ORG. */
function repository(
  memberships: Memberships,
  overrides: Partial<OrganizationRepository> = {},
): OrganizationRepository {
  return {
    findMembershipForUser: vi.fn((organizationId: string, userId: string) => {
      const role = organizationId === ORG ? memberships[userId] : undefined;
      return Promise.resolve(role === undefined ? null : { organizationId, userId, role });
    }),
    listMembers: vi.fn().mockResolvedValue([{ userId: CALLER }]),
    listDevicesForOrganization: vi.fn().mockResolvedValue([{ deviceId: 'd1' }]),
    addMember: vi.fn((data: { userId: string; role: OrganizationRole }) =>
      Promise.resolve({ organizationId: ORG, userId: data.userId, role: data.role }),
    ),
    createWithOwner: vi.fn().mockResolvedValue({ id: ORG }),
    listOrganizationsForUser: vi.fn().mockResolvedValue([]),
    ...overrides,
  } as Partial<OrganizationRepository> as OrganizationRepository;
}

function service(repo: OrganizationRepository): OrganizationMembershipService {
  return new OrganizationMembershipService(repo, new OrganizationAccessService(repo));
}

describe('OrganizationMembershipService', () => {
  describe('addMember', () => {
    it.each([OrganizationRole.OWNER, OrganizationRole.ADMIN])(
      'lets a %s add a member',
      async (role) => {
        const repo = repository({ [CALLER]: role });

        await expect(
          service(repo).addMember(ORG, CALLER, { userId: TARGET, role: OrganizationRole.MEMBER }),
        ).resolves.toMatchObject({ userId: TARGET, role: OrganizationRole.MEMBER });
        expect(repo.addMember).toHaveBeenCalledWith({
          organization: { connect: { id: ORG } },
          userId: TARGET,
          role: OrganizationRole.MEMBER,
        });
      },
    );

    it('refuses a plain member with 403 and writes nothing', async () => {
      const repo = repository({ [CALLER]: OrganizationRole.MEMBER });

      await expect(
        service(repo).addMember(ORG, CALLER, { userId: TARGET, role: OrganizationRole.MEMBER }),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(repo.addMember).not.toHaveBeenCalled();
    });

    // The reported bug: any signed-in user could add a member (even an OWNER)
    // to an organization they did not belong to.
    it('answers an outsider with 404 and writes nothing', async () => {
      const repo = repository({});

      await expect(
        service(repo).addMember(ORG, CALLER, { userId: CALLER, role: OrganizationRole.OWNER }),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(repo.addMember).not.toHaveBeenCalled();
    });

    // Platform RBAC does not reach into a coding-agent organization: the
    // service receives only the caller's id, so a platform ADMIN who is not a
    // member is an outsider like any other.
    it('gives a non-member platform admin the same 404', async () => {
      const repo = repository({});

      await expect(
        service(repo).addMember(ORG, 'platform-admin', {
          userId: TARGET,
          role: OrganizationRole.MEMBER,
        }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('refuses an ADMIN minting an OWNER, which would outrank them', async () => {
      const repo = repository({ [CALLER]: OrganizationRole.ADMIN });

      await expect(
        service(repo).addMember(ORG, CALLER, { userId: TARGET, role: OrganizationRole.OWNER }),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(repo.addMember).not.toHaveBeenCalled();
    });

    it('lets an OWNER add another OWNER', async () => {
      const repo = repository({ [CALLER]: OrganizationRole.OWNER });

      await expect(
        service(repo).addMember(ORG, CALLER, { userId: TARGET, role: OrganizationRole.OWNER }),
      ).resolves.toMatchObject({ role: OrganizationRole.OWNER });
    });

    // Self-escalation: re-adding yourself with a higher role must not work.
    it('refuses an ADMIN re-adding themselves as OWNER', async () => {
      const repo = repository({ [CALLER]: OrganizationRole.ADMIN });

      await expect(
        service(repo).addMember(ORG, CALLER, { userId: CALLER, role: OrganizationRole.OWNER }),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(repo.addMember).not.toHaveBeenCalled();
    });

    it('refuses an existing member with 409 instead of changing their role', async () => {
      const repo = repository({
        [CALLER]: OrganizationRole.OWNER,
        [TARGET]: OrganizationRole.MEMBER,
      });

      await expect(
        service(repo).addMember(ORG, CALLER, { userId: TARGET, role: OrganizationRole.ADMIN }),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(repo.addMember).not.toHaveBeenCalled();
    });
  });

  describe('listMembers', () => {
    it('lets a plain member list the members', async () => {
      const repo = repository({ [CALLER]: OrganizationRole.MEMBER });

      await expect(service(repo).listMembers(ORG, CALLER)).resolves.toEqual([{ userId: CALLER }]);
    });

    it('answers an outsider with 404 and reads nothing', async () => {
      const repo = repository({});

      await expect(service(repo).listMembers(ORG, CALLER)).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(repo.listMembers).not.toHaveBeenCalled();
    });
  });

  describe('listDevices', () => {
    it.each([OrganizationRole.OWNER, OrganizationRole.ADMIN])(
      'lets a %s read the device matrix',
      async (role) => {
        const repo = repository({ [CALLER]: role });

        await expect(service(repo).listDevices(ORG, CALLER)).resolves.toEqual([{ deviceId: 'd1' }]);
      },
    );

    // The matrix is every member's devices; a member sees only their own
    // membership, not their colleagues' machines.
    it('refuses a plain member with 403', async () => {
      const repo = repository({ [CALLER]: OrganizationRole.MEMBER });

      await expect(service(repo).listDevices(ORG, CALLER)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
      expect(repo.listDevicesForOrganization).not.toHaveBeenCalled();
    });

    it('answers an outsider with 404', async () => {
      const repo = repository({});

      await expect(service(repo).listDevices(ORG, CALLER)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('create', () => {
    it('creates the organization with the caller as its OWNER in one write', async () => {
      const repo = repository({});

      await service(repo).create(CALLER, { name: 'Acme', slug: 'acme', ssoEnabled: false });

      expect(repo.createWithOwner).toHaveBeenCalledWith(
        { name: 'Acme', slug: 'acme', ssoEnabled: false },
        CALLER,
      );
    });
  });
});
