import { Test, type TestingModule } from '@nestjs/testing';
import { DomainTag, PrivacyClass } from '../../../generated/prisma';
import { EntityNotFoundException } from '../../../common/errors';
import { TaxonomyService } from '../services/taxonomy.service';
import { TaxonomyRoleRepository } from '../repositories/taxonomy-role.repository';

const fakeRole = {
  id: 'role-1',
  roleKey: 'physician',
  displayName: 'Physician',
  industryKey: 'healthcare',
  domainKey: DomainTag.MEDICAL,
  capabilities: ['diagnose', 'prescribe'],
  privacyDefault: PrivacyClass.LOCAL_PREFERRED,
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
};

describe('TaxonomyService', () => {
  let service: TaxonomyService;
  let repo: jest.Mocked<TaxonomyRoleRepository>;

  beforeEach(async () => {
    repo = {
      list: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
    } as unknown as jest.Mocked<TaxonomyRoleRepository>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [TaxonomyService, { provide: TaxonomyRoleRepository, useValue: repo }],
    }).compile();

    service = module.get<TaxonomyService>(TaxonomyService);
  });

  describe('listRoles', () => {
    it('paginates and returns meta', async () => {
      repo.list.mockResolvedValue({ items: [fakeRole], total: 1 });
      const result = await service.listRoles({ page: 1, limit: 20 } as never);
      expect(result.data).toHaveLength(1);
      expect(result.meta.totalPages).toBe(1);
    });

    it('forwards skip based on page', async () => {
      repo.list.mockResolvedValue({ items: [], total: 0 });
      await service.listRoles({ page: 2, limit: 20 } as never);
      expect(repo.list.mock.calls[0]![0].skip).toBe(20);
    });
  });

  describe('getRole', () => {
    it('throws when not found', async () => {
      repo.findById.mockResolvedValue(null);
      await expect(service.getRole('missing')).rejects.toThrow(EntityNotFoundException);
    });

    it('returns the role when found', async () => {
      repo.findById.mockResolvedValue(fakeRole);
      const result = await service.getRole('role-1');
      expect(result.roleKey).toBe('physician');
    });
  });

  describe('createRole', () => {
    it('forwards mapped DTO to repo', async () => {
      repo.create.mockResolvedValue(fakeRole);
      await service.createRole({
        roleKey: 'physician',
        displayName: 'Physician',
        industryKey: 'healthcare',
        domainKey: DomainTag.MEDICAL,
        capabilities: ['diagnose'],
        privacyDefault: PrivacyClass.LOCAL_PREFERRED,
      });
      const call = repo.create.mock.calls[0]![0];
      expect(call.roleKey).toBe('physician');
      expect(call.domainKey).toBe(DomainTag.MEDICAL);
    });
  });
});
