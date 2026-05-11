import { Test, type TestingModule } from '@nestjs/testing';
import { EntityNotFoundException } from '../../../common/errors';
import { RouterModelsService } from '../services/router-models.service';
import { RouterModelRegistryManager } from '../managers/router-model-registry.manager';
import { RouterModelRegistryRepository } from '../repositories/router-model-registry.repository';

const fakeRecord = {
  id: 'r1',
  provider: 'OPENAI',
  modelKey: 'gpt-4o',
} as never;

describe('RouterModelsService', () => {
  let service: RouterModelsService;
  let registryRepo: jest.Mocked<RouterModelRegistryRepository>;
  let manager: jest.Mocked<RouterModelRegistryManager>;

  beforeEach(async () => {
    registryRepo = {
      list: jest.fn(),
      findById: jest.fn(),
    } as unknown as jest.Mocked<RouterModelRegistryRepository>;

    manager = {
      createProfile: jest.fn(),
      updateProfile: jest.fn(),
      softRemoveProfile: jest.fn(),
      listOverrides: jest.fn(),
      clearOverride: jest.fn(),
    } as unknown as jest.Mocked<RouterModelRegistryManager>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RouterModelsService,
        { provide: RouterModelRegistryRepository, useValue: registryRepo },
        { provide: RouterModelRegistryManager, useValue: manager },
      ],
    }).compile();

    service = module.get<RouterModelsService>(RouterModelsService);
  });

  describe('list', () => {
    it('returns paginated payload with meta', async () => {
      registryRepo.list.mockResolvedValue({ items: [fakeRecord], total: 1 });
      const result = await service.list({
        page: 1,
        limit: 20,
      } as never);
      expect(result.data).toHaveLength(1);
      expect(result.meta).toEqual({ total: 1, page: 1, limit: 20, totalPages: 1 });
    });

    it('computes totalPages correctly with non-multiple total', async () => {
      registryRepo.list.mockResolvedValue({ items: [], total: 25 });
      const result = await service.list({ page: 1, limit: 10 } as never);
      expect(result.meta.totalPages).toBe(3);
    });

    it('forwards skip based on page * limit', async () => {
      registryRepo.list.mockResolvedValue({ items: [], total: 0 });
      await service.list({ page: 3, limit: 10 } as never);
      const call = registryRepo.list.mock.calls[0]![0];
      expect(call.skip).toBe(20);
      expect(call.take).toBe(10);
    });
  });

  describe('get', () => {
    it('throws EntityNotFoundException when not found', async () => {
      registryRepo.findById.mockResolvedValue(null);
      await expect(service.get('missing')).rejects.toThrow(EntityNotFoundException);
    });

    it('returns the record when found', async () => {
      registryRepo.findById.mockResolvedValue(fakeRecord);
      const result = await service.get('r1');
      expect(result.id).toBe('r1');
    });
  });

  describe('update', () => {
    it('verifies existence before update', async () => {
      registryRepo.findById.mockResolvedValue(null);
      await expect(service.update('missing', {} as never, 'user-1')).rejects.toThrow(
        EntityNotFoundException,
      );
      expect(manager.updateProfile).not.toHaveBeenCalled();
    });

    it('forwards to manager when present', async () => {
      registryRepo.findById.mockResolvedValue(fakeRecord);
      manager.updateProfile.mockResolvedValue(fakeRecord);
      await service.update('r1', { qualityTier: 'S' } as never, 'user-1');
      expect(manager.updateProfile).toHaveBeenCalledWith('r1', { qualityTier: 'S' }, 'user-1');
    });
  });

  describe('softDelete', () => {
    it('checks existence then delegates to manager', async () => {
      registryRepo.findById.mockResolvedValue(fakeRecord);
      manager.softRemoveProfile.mockResolvedValue(fakeRecord);
      await service.softDelete('r1');
      expect(manager.softRemoveProfile).toHaveBeenCalledWith('r1');
    });
  });

  describe('listOverrides / clearOverride', () => {
    it('listOverrides delegates to manager', async () => {
      registryRepo.findById.mockResolvedValue(fakeRecord);
      manager.listOverrides.mockResolvedValue([]);
      await service.listOverrides('r1');
      expect(manager.listOverrides).toHaveBeenCalledWith('r1');
    });

    it('clearOverride delegates to manager', async () => {
      registryRepo.findById.mockResolvedValue(fakeRecord);
      manager.clearOverride.mockResolvedValue(undefined as never);
      await service.clearOverride('r1', 'outputCostPer1M');
      expect(manager.clearOverride).toHaveBeenCalledWith('r1', 'outputCostPer1M');
    });
  });
});
