import { Test, type TestingModule } from '@nestjs/testing';
import {
  CostConfidence,
  ModelLifecycle,
  PrivacyClass,
  QualityTier,
} from '../../../generated/prisma';
import { RouterModelRegistryManager } from '../managers/router-model-registry.manager';
import { RouterModelRegistryRepository } from '../repositories/router-model-registry.repository';
import { RouterAdminOverrideRepository } from '../repositories/router-admin-override.repository';

const fakeRecord = {
  id: 'r1',
  provider: 'OPENAI',
  modelKey: 'gpt-4o',
  displayName: 'GPT-4o',
} as never;

describe('RouterModelRegistryManager', () => {
  let manager: RouterModelRegistryManager;
  let registryRepo: jest.Mocked<RouterModelRegistryRepository>;
  let overrideRepo: jest.Mocked<RouterAdminOverrideRepository>;

  beforeEach(async () => {
    registryRepo = {
      create: jest.fn(),
      update: jest.fn(),
      softDelete: jest.fn(),
    } as unknown as jest.Mocked<RouterModelRegistryRepository>;

    overrideRepo = {
      upsertOverride: jest.fn(),
      listByProfileId: jest.fn(),
      deactivate: jest.fn(),
    } as unknown as jest.Mocked<RouterAdminOverrideRepository>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RouterModelRegistryManager,
        { provide: RouterModelRegistryRepository, useValue: registryRepo },
        { provide: RouterAdminOverrideRepository, useValue: overrideRepo },
      ],
    }).compile();

    manager = module.get<RouterModelRegistryManager>(RouterModelRegistryManager);
  });

  describe('createProfile', () => {
    it('passes mapped CreateInput to repo', async () => {
      registryRepo.create.mockResolvedValue(fakeRecord);
      await manager.createProfile({
        provider: 'OPENAI',
        modelKey: 'gpt-4o',
        displayName: 'GPT-4o',
        isLocal: false,
        isRouterOnly: false,
        isExecutionCapable: true,
        lifecycle: ModelLifecycle.ACTIVE,
        modalitiesIn: [],
        modalitiesOut: [],
        domainTags: [],
        notRecommendedFor: [],
        costConfidence: CostConfidence.UNKNOWN,
        qualityTier: QualityTier.B,
        judgeSuitability: false,
        searchSuitability: false,
        fallbackSuitability: true,
        privacySupport: PrivacyClass.CLOUD_PERMITTED,
        metadataSource: 'manual',
      });
      const call = registryRepo.create.mock.calls[0]![0];
      expect(call.provider).toBe('OPENAI');
      expect(call.modelKey).toBe('gpt-4o');
    });
  });

  describe('updateProfile', () => {
    it('records an override row for each managed field changed', async () => {
      registryRepo.update.mockResolvedValue(fakeRecord);
      overrideRepo.upsertOverride.mockResolvedValue({} as never);

      await manager.updateProfile(
        'r1',
        { outputCostPer1M: 12.5, qualityTier: QualityTier.S, overrideReason: 'CFO pin' },
        'user-1',
      );

      expect(overrideRepo.upsertOverride).toHaveBeenCalledTimes(2);
      const calls = overrideRepo.upsertOverride.mock.calls.map((c) => c[0].fieldName);
      expect(calls).toContain('outputCostPer1M');
      expect(calls).toContain('qualityTier');
    });

    it('does not record an override when only displayName changes (display IS managed)', async () => {
      registryRepo.update.mockResolvedValue(fakeRecord);
      overrideRepo.upsertOverride.mockResolvedValue({} as never);
      await manager.updateProfile('r1', { displayName: 'GPT-4o (admin)' }, 'user-1');
      // displayName is in OVERRIDE_MANAGED_FIELDS — should be recorded
      expect(overrideRepo.upsertOverride).toHaveBeenCalledTimes(1);
      expect(overrideRepo.upsertOverride.mock.calls[0]![0].fieldName).toBe('displayName');
    });

    it('passes overrideReason through to override repo', async () => {
      registryRepo.update.mockResolvedValue(fakeRecord);
      overrideRepo.upsertOverride.mockResolvedValue({} as never);
      await manager.updateProfile(
        'r1',
        { qualityTier: QualityTier.S, overrideReason: 'verified S-tier' },
        'user-1',
      );
      expect(overrideRepo.upsertOverride.mock.calls[0]![0].reason).toBe('verified S-tier');
    });
  });

  describe('getProtectedFieldNames', () => {
    it('returns names of active overrides as a Set', async () => {
      overrideRepo.listByProfileId.mockResolvedValue([
        {
          id: 'o1',
          profileId: 'r1',
          fieldName: 'outputCostPer1M',
          fieldValue: 12.5,
          reason: null,
          setBy: 'u',
          setAt: new Date(),
          isActive: true,
        },
        {
          id: 'o2',
          profileId: 'r1',
          fieldName: 'qualityTier',
          fieldValue: 'S',
          reason: null,
          setBy: 'u',
          setAt: new Date(),
          isActive: true,
        },
      ]);
      const set = await manager.getProtectedFieldNames('r1');
      expect(set.size).toBe(2);
      expect(set.has('outputCostPer1M')).toBe(true);
      expect(set.has('qualityTier')).toBe(true);
    });
  });

  describe('softRemoveProfile', () => {
    it('calls repo.softDelete', async () => {
      registryRepo.softDelete.mockResolvedValue(fakeRecord);
      await manager.softRemoveProfile('r1');
      expect(registryRepo.softDelete).toHaveBeenCalledWith('r1');
    });
  });

  describe('transitionLifecycle', () => {
    it('updates lifecycle field only', async () => {
      registryRepo.update.mockResolvedValue(fakeRecord);
      await manager.transitionLifecycle('r1', ModelLifecycle.DEPRECATED);
      expect(registryRepo.update).toHaveBeenCalledWith('r1', {
        lifecycle: ModelLifecycle.DEPRECATED,
      });
    });
  });
});
