import { vi } from 'vitest';
import { ForbiddenException, NotFoundException } from '@nestjs/common';

import { OrganizationAccessService } from '../organization-access.service';
import { OrganizationUsageScopeService } from '../organization-usage-scope.service';

import { OrganizationRole } from '../../../../generated/prisma';
import type { OrganizationRepository } from '../../repositories/organization.repository';

function build(role: OrganizationRole | null) {
  const listMembers = vi.fn().mockResolvedValue([{ userId: 'owner-1' }, { userId: 'member-2' }]);
  const repo = {
    findMembershipForUser: vi.fn().mockResolvedValue(role === null ? null : { role }),
    listMembers,
  } as Partial<OrganizationRepository> as OrganizationRepository;
  const service = new OrganizationUsageScopeService(repo, new OrganizationAccessService(repo));
  return { service, listMembers };
}

describe('OrganizationUsageScopeService', () => {
  it.each([OrganizationRole.OWNER, OrganizationRole.ADMIN])(
    'gives a %s the member ids',
    async (role) => {
      const { service } = build(role);
      await expect(service.forAdministrator('org-1', 'owner-1')).resolves.toEqual({
        organizationId: 'org-1',
        memberUserIds: ['owner-1', 'member-2'],
      });
    },
  );

  it('refuses a plain member with 403 and lists nobody', async () => {
    const { service, listMembers } = build(OrganizationRole.MEMBER);
    await expect(service.forAdministrator('org-1', 'member-2')).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(listMembers).not.toHaveBeenCalled();
  });

  it('answers a stranger with 404 and lists nobody', async () => {
    const { service, listMembers } = build(null);
    await expect(service.forAdministrator('org-1', 'stranger')).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(listMembers).not.toHaveBeenCalled();
  });
});
