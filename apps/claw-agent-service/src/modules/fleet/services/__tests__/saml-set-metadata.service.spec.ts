import { vi } from 'vitest';
import { ForbiddenException, NotFoundException } from '@nestjs/common';

import { OrganizationAccessService } from '../organization-access.service';
import { SamlService } from '../saml.service';

import { OrganizationRole } from '../../../../generated/prisma';
import type { OrganizationRepository } from '../../repositories/organization.repository';

const METADATA = { expectedIssuer: 'https://idp.example' };

function repository(role: OrganizationRole | null, orgExists = true): OrganizationRepository {
  return {
    findBySlug: vi.fn().mockResolvedValue(orgExists ? { id: 'org-1', slug: 'acme' } : null),
    findMembershipForUser: vi.fn().mockResolvedValue(role === null ? null : { role }),
    updateMetadata: vi.fn().mockResolvedValue({}),
  } as Partial<OrganizationRepository> as OrganizationRepository;
}

function service(repo: OrganizationRepository): SamlService {
  return new SamlService(repo, new OrganizationAccessService(repo));
}

describe('SamlService.setMetadata', () => {
  it.each([OrganizationRole.OWNER, OrganizationRole.ADMIN])(
    'lets a %s set the SSO metadata',
    async (role) => {
      const repo = repository(role);

      await service(repo).setMetadata('acme', 'caller-1', METADATA);

      expect(repo.findMembershipForUser).toHaveBeenCalledWith('org-1', 'caller-1');
      expect(repo.updateMetadata).toHaveBeenCalledWith('org-1', {
        ssoEnabled: true,
        ssoMetadataJson: METADATA,
      });
    },
  );

  it('refuses a plain member with 403 and writes nothing', async () => {
    const repo = repository(OrganizationRole.MEMBER);

    await expect(service(repo).setMetadata('acme', 'caller-1', METADATA)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(repo.updateMetadata).not.toHaveBeenCalled();
  });

  // Whoever controls the IdP metadata controls who can sign in as the org.
  it('answers an outsider with 404 and writes nothing', async () => {
    const repo = repository(null);

    await expect(service(repo).setMetadata('acme', 'stranger', METADATA)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(repo.updateMetadata).not.toHaveBeenCalled();
  });

  it('gives an unknown slug the same 404 as a stranger', async () => {
    const repo = repository(null, false);

    await expect(service(repo).setMetadata('nope', 'caller-1', METADATA)).rejects.toThrow(
      new NotFoundException('Organization not found'),
    );
  });
});
