import { Test, type TestingModule } from '@nestjs/testing';
import { EntityNotFoundException } from '../../../common/errors';
import { RouterModelRegistryRepository } from '../repositories/router-model-registry.repository';
import { ModelIntelligenceService } from '../services/model-intelligence.service';

function fakeRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: 'r1',
    provider: 'OPENAI',
    modelKey: 'gpt-4o',
    displayName: 'GPT-4o',
    family: 'gpt-4o',
    connectorId: null,
    runtimeId: null,
    isLocal: false,
    isRouterOnly: false,
    isExecutionCapable: true,
    lifecycle: 'ACTIVE',
    modalitiesIn: [],
    modalitiesOut: [],
    contextWindowTokens: null,
    maxOutputTokens: null,
    domainTags: [],
    notRecommendedFor: [],
    inputCostPer1M: null,
    outputCostPer1M: null,
    costConfidence: 'UNKNOWN',
    costClass: null,
    latencyP50Ms: null,
    latencyP95Ms: null,
    latencyClass: null,
    qualityTier: 'B',
    hallucinationRisk: null,
    judgeSuitability: false,
    searchSuitability: false,
    fallbackSuitability: true,
    privacySupport: 'CLOUD_PERMITTED',
    metadataSource: 'seed',
    externalCardUrl: null,
    notes: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSyncedAt: null,
    supportsStreaming: null,
    supportsTools: null,
    supportsStructuredOutput: null,
    supportsVision: null,
    supportsAudioInput: null,
    supportsAudioOutput: null,
    supportsVideoInput: null,
    supportsFileInput: null,
    supportsEmbeddings: null,
    supportsLongContext: null,
    maxContextTokens: null,
    maxOutputTokensIntel: null,
    domainStrengths: [],
    roleStrengths: [],
    weakDomains: [],
    bestFor: [],
    avoidFor: [],
    languageStrengths: [],
    qualityTierLabel: null,
    costClassLabel: null,
    costConfidenceLabel: null,
    estimatedInputCostPer1M: null,
    estimatedOutputCostPer1M: null,
    latencyClassLabel: null,
    privacyClassLabel: null,
    adminOverrideJson: null,
    lastEnrichedAt: null,
    ...overrides,
  };
}

describe('ModelIntelligenceService', () => {
  let service: ModelIntelligenceService;
  let registryRepo: jest.Mocked<RouterModelRegistryRepository>;

  beforeEach(async () => {
    registryRepo = {
      findByProviderAndModelKey: jest.fn(),
      patchIntelligence: jest.fn(),
    } as unknown as jest.Mocked<RouterModelRegistryRepository>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ModelIntelligenceService,
        { provide: RouterModelRegistryRepository, useValue: registryRepo },
      ],
    }).compile();
    service = module.get<ModelIntelligenceService>(ModelIntelligenceService);
  });

  describe('getIntelligence', () => {
    it('returns the resolved view when the row exists', async () => {
      registryRepo.findByProviderAndModelKey.mockResolvedValue(
        fakeRow({ qualityTierLabel: 'PRO' }) as never,
      );
      const result = await service.getIntelligence('OPENAI', 'gpt-4o');
      expect(result.provider).toBe('OPENAI');
      expect(result.qualityTierLabel).toBe('PRO');
    });

    it('throws EntityNotFoundException when the row does not exist', async () => {
      registryRepo.findByProviderAndModelKey.mockResolvedValue(null);
      await expect(service.getIntelligence('UNKNOWN', 'model')).rejects.toThrow(
        EntityNotFoundException,
      );
    });

    it('passes the existing adminOverrideJson through to the response', async () => {
      registryRepo.findByProviderAndModelKey.mockResolvedValue(
        fakeRow({ adminOverrideJson: { qualityTierLabel: 'FRONTIER' } }) as never,
      );
      const result = await service.getIntelligence('OPENAI', 'gpt-4o');
      expect(result.adminOverrideJson).toEqual({ qualityTierLabel: 'FRONTIER' });
    });
  });

  describe('patchIntelligence', () => {
    it('writes the override JSON AND the typed columns', async () => {
      registryRepo.findByProviderAndModelKey.mockResolvedValue(fakeRow() as never);
      registryRepo.patchIntelligence.mockResolvedValue(
        fakeRow({
          qualityTierLabel: 'FRONTIER',
          adminOverrideJson: { qualityTierLabel: 'FRONTIER' },
        }) as never,
      );

      const result = await service.patchIntelligence('OPENAI', 'gpt-4o', {
        qualityTierLabel: 'FRONTIER',
      });
      const call = registryRepo.patchIntelligence.mock.calls[0]![1] as Record<string, unknown>;
      expect(call.qualityTierLabel).toBe('FRONTIER');
      expect(call.adminOverrideJson).toEqual({ qualityTierLabel: 'FRONTIER' });
      expect(result.qualityTierLabel).toBe('FRONTIER');
    });

    it('merges incoming override with existing adminOverrideJson', async () => {
      registryRepo.findByProviderAndModelKey.mockResolvedValue(
        fakeRow({
          adminOverrideJson: { costClassLabel: 'PREMIUM', supportsTools: true },
        }) as never,
      );
      registryRepo.patchIntelligence.mockResolvedValue(fakeRow() as never);

      await service.patchIntelligence('OPENAI', 'gpt-4o', { qualityTierLabel: 'FRONTIER' });
      const call = registryRepo.patchIntelligence.mock.calls[0]![1] as Record<string, unknown>;
      expect(call.adminOverrideJson).toEqual({
        costClassLabel: 'PREMIUM',
        supportsTools: true,
        qualityTierLabel: 'FRONTIER',
      });
    });

    it('throws EntityNotFoundException when the row does not exist', async () => {
      registryRepo.findByProviderAndModelKey.mockResolvedValue(null);
      await expect(
        service.patchIntelligence('UNKNOWN', 'model', { qualityTierLabel: 'PRO' }),
      ).rejects.toThrow(EntityNotFoundException);
      expect(registryRepo.patchIntelligence).not.toHaveBeenCalled();
    });

    it('strips non-override keys before persisting the override JSON', async () => {
      registryRepo.findByProviderAndModelKey.mockResolvedValue(fakeRow() as never);
      registryRepo.patchIntelligence.mockResolvedValue(fakeRow() as never);

      await service.patchIntelligence('OPENAI', 'gpt-4o', {
        qualityTierLabel: 'PRO',
      });
      const call = registryRepo.patchIntelligence.mock.calls[0]![1] as Record<string, unknown>;
      const override = call.adminOverrideJson as Record<string, unknown>;
      expect(override).toHaveProperty('qualityTierLabel');
      expect(override).not.toHaveProperty('id');
      expect(override).not.toHaveProperty('provider');
    });

    it('persists boolean capability flags including explicit null', async () => {
      registryRepo.findByProviderAndModelKey.mockResolvedValue(fakeRow() as never);
      registryRepo.patchIntelligence.mockResolvedValue(fakeRow() as never);

      await service.patchIntelligence('OPENAI', 'gpt-4o', {
        supportsTools: true,
        supportsVision: null,
      });
      const call = registryRepo.patchIntelligence.mock.calls[0]![1] as Record<string, unknown>;
      expect(call.supportsTools).toBe(true);
      expect(call.supportsVision).toBeNull();
    });

    it('persists string arrays (domainStrengths)', async () => {
      registryRepo.findByProviderAndModelKey.mockResolvedValue(fakeRow() as never);
      registryRepo.patchIntelligence.mockResolvedValue(fakeRow() as never);

      await service.patchIntelligence('OPENAI', 'gpt-4o', {
        domainStrengths: ['coding', 'reasoning'],
      });
      const call = registryRepo.patchIntelligence.mock.calls[0]![1] as Record<string, unknown>;
      expect(call.domainStrengths).toEqual(['coding', 'reasoning']);
    });
  });

  describe('resetOverride', () => {
    it('clears the adminOverrideJson block', async () => {
      registryRepo.findByProviderAndModelKey.mockResolvedValue(
        fakeRow({ adminOverrideJson: { qualityTierLabel: 'FRONTIER' } }) as never,
      );
      registryRepo.patchIntelligence.mockResolvedValue(
        fakeRow({ adminOverrideJson: null }) as never,
      );

      const result = await service.resetOverride('OPENAI', 'gpt-4o');
      const call = registryRepo.patchIntelligence.mock.calls[0]![1] as Record<string, unknown>;
      // The repo should be called with a DbNull (or null) for adminOverrideJson
      expect(call).toHaveProperty('adminOverrideJson');
      expect(result.adminOverrideJson).toBeNull();
    });

    it('throws EntityNotFoundException when the row does not exist', async () => {
      registryRepo.findByProviderAndModelKey.mockResolvedValue(null);
      await expect(service.resetOverride('UNKNOWN', 'model')).rejects.toThrow(
        EntityNotFoundException,
      );
    });
  });

  describe('getProtectedIntelligenceKeys', () => {
    it('returns the keys of the adminOverrideJson block', async () => {
      registryRepo.findByProviderAndModelKey.mockResolvedValue(
        fakeRow({
          adminOverrideJson: {
            qualityTierLabel: 'FRONTIER',
            costClassLabel: 'PREMIUM',
          },
        }) as never,
      );

      const keys = await service.getProtectedIntelligenceKeys('OPENAI', 'gpt-4o');
      expect(keys.size).toBe(2);
      expect(keys.has('qualityTierLabel')).toBe(true);
      expect(keys.has('costClassLabel')).toBe(true);
    });

    it('returns empty set when row is missing', async () => {
      registryRepo.findByProviderAndModelKey.mockResolvedValue(null);
      const keys = await service.getProtectedIntelligenceKeys('UNKNOWN', 'model');
      expect(keys.size).toBe(0);
    });

    it('returns empty set when row has no adminOverrideJson', async () => {
      registryRepo.findByProviderAndModelKey.mockResolvedValue(
        fakeRow({ adminOverrideJson: null }) as never,
      );
      const keys = await service.getProtectedIntelligenceKeys('OPENAI', 'gpt-4o');
      expect(keys.size).toBe(0);
    });
  });
});
