import { vi } from 'vitest';
import { ForbiddenException, NotFoundException } from '@nestjs/common';

import { OrganizationAccessService } from '../organization-access.service';

import { OrganizationRole } from '../../../../generated/prisma';
import type { OrganizationRepository } from '../../repositories/organization.repository';

function repositoryWithRole(role: OrganizationRole | null): OrganizationRepository {
  const membership = role === null ? null : { role };
  return {
    findMembershipForUser: vi.fn().mockResolvedValue(membership),
  } as Partial<OrganizationRepository> as OrganizationRepository;
}

describe('OrganizationAccessService', () => {
  describe('requireMember', () => {
    it.each([OrganizationRole.OWNER, OrganizationRole.ADMIN, OrganizationRole.MEMBER])(
      'admits a %s',
      async (role) => {
        const access = new OrganizationAccessService(repositoryWithRole(role));

        await expect(access.requireMember('org-1', 'user-1')).resolves.toEqual({ role });
      },
    );

    // Telling a stranger that the organization exists is itself a disclosure.
    it('answers an outsider with 404, never 403', async () => {
      const access = new OrganizationAccessService(repositoryWithRole(null));

      await expect(access.requireMember('org-1', 'stranger')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('requireAdministrator', () => {
    it.each([OrganizationRole.OWNER, OrganizationRole.ADMIN])('admits a %s', async (role) => {
      const access = new OrganizationAccessService(repositoryWithRole(role));

      await expect(access.requireAdministrator('org-1', 'user-1')).resolves.toEqual({ role });
    });

    it('refuses a plain member with 403', async () => {
      const access = new OrganizationAccessService(repositoryWithRole(OrganizationRole.MEMBER));

      await expect(access.requireAdministrator('org-1', 'user-1')).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });

    it('answers an outsider with 404', async () => {
      const access = new OrganizationAccessService(repositoryWithRole(null));

      await expect(access.requireAdministrator('org-1', 'stranger')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('looks the membership up for the caller and that organization only', async () => {
      const repo = repositoryWithRole(OrganizationRole.OWNER);
      const access = new OrganizationAccessService(repo);

      await access.requireAdministrator('org-9', 'caller-3');

      expect(repo.findMembershipForUser).toHaveBeenCalledWith('org-9', 'caller-3');
    });
  });
});
