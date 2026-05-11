import { Test, type TestingModule } from '@nestjs/testing';
import {
  CostConfidence,
  ModalityKind,
  ModelLifecycle,
  PrivacyClass,
  QualityTier,
} from '../../../generated/prisma';
import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import { RouterModelRegistryRepository } from '../repositories/router-model-registry.repository';

const baseFakeRow = {
  id: 'r1',
  provider: 'OPENAI',
  modelKey: 'gpt-4o',
  displayName: 'GPT-4o',
  family: 'gpt-4',
  connectorId: null,
  runtimeId: null,
  isLocal: false,
  isRouterOnly: false,
  isExecutionCapable: true,
  lifecycle: ModelLifecycle.ACTIVE,
  modalitiesIn: [ModalityKind.TEXT],
  modalitiesOut: [ModalityKind.TEXT],
  contextWindowTokens: 128000,
  maxOutputTokens: 16384,
  domainTags: [],
  notRecommendedFor: [],
  inputCostPer1M: { toString: () => '5.0' },
  outputCostPer1M: { toString: () => '15.0' },
  costConfidence: CostConfidence.EXACT,
  costClass: null,
  latencyP50Ms: 800,
  latencyP95Ms: 1500,
  latencyClass: null,
  qualityTier: QualityTier.S,
  hallucinationRisk: null,
  judgeSuitability: true,
  searchSuitability: false,
  fallbackSuitability: true,
  privacySupport: PrivacyClass.CLOUD_PERMITTED,
  metadataSource: 'seed',
  externalCardUrl: null,
  notes: null,
  createdAt: new Date('2026-01-01T00:00:00Z'),
  updatedAt: new Date('2026-01-01T00:00:00Z'),
  lastSyncedAt: null,
};

describe('RouterModelRegistryRepository', () => {
  let repo: RouterModelRegistryRepository;
  let prisma: { routerModelRegistry: Record<string, jest.Mock>; $transaction: jest.Mock };

  beforeEach(async () => {
    prisma = {
      routerModelRegistry: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        upsert: jest.fn(),
      },
      $transaction: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [RouterModelRegistryRepository, { provide: PrismaService, useValue: prisma }],
    }).compile();

    repo = module.get<RouterModelRegistryRepository>(RouterModelRegistryRepository);
  });

  describe('findById', () => {
    it('returns null when not found', async () => {
      prisma.routerModelRegistry.findUnique!.mockResolvedValue(null);
      const result = await repo.findById('missing');
      expect(result).toBeNull();
    });

    it('maps Decimal cost fields to string', async () => {
      prisma.routerModelRegistry.findUnique!.mockResolvedValue(baseFakeRow);
      const result = await repo.findById('r1');
      expect(result?.inputCostPer1M).toBe('5.0');
      expect(result?.outputCostPer1M).toBe('15.0');
    });
  });

  describe('findByProviderAndModelKey', () => {
    it('queries by composite unique', async () => {
      prisma.routerModelRegistry.findUnique!.mockResolvedValue(baseFakeRow);
      await repo.findByProviderAndModelKey('OPENAI', 'gpt-4o');
      expect(prisma.routerModelRegistry.findUnique).toHaveBeenCalledWith({
        where: { provider_modelKey: { provider: 'OPENAI', modelKey: 'gpt-4o' } },
      });
    });
  });

  describe('list', () => {
    it('returns paginated payload', async () => {
      prisma.$transaction!.mockResolvedValue([[baseFakeRow], 1]);
      const result = await repo.list({ skip: 0, take: 10 });
      expect(result.total).toBe(1);
      expect(result.items).toHaveLength(1);
    });

    it('filters by provider', async () => {
      prisma.$transaction!.mockResolvedValue([[], 0]);
      await repo.list({ skip: 0, take: 10, provider: 'ANTHROPIC' });
      const findManyCall = prisma.routerModelRegistry.findMany!.mock.calls[0]![0];
      expect(findManyCall.where).toMatchObject({ provider: 'ANTHROPIC' });
    });

    it('builds case-insensitive OR search clause', async () => {
      prisma.$transaction!.mockResolvedValue([[], 0]);
      await repo.list({ skip: 0, take: 10, search: 'opus' });
      const findManyCall = prisma.routerModelRegistry.findMany!.mock.calls[0]![0];
      expect(findManyCall.where.OR).toBeDefined();
      expect(findManyCall.where.OR.length).toBe(3);
    });
  });

  describe('findExecutionCandidates', () => {
    it('filters lifecycle=ACTIVE and execution-capable by default', async () => {
      prisma.routerModelRegistry.findMany!.mockResolvedValue([baseFakeRow]);
      await repo.findExecutionCandidates({});
      const call = prisma.routerModelRegistry.findMany!.mock.calls[0]![0];
      expect(call.where.lifecycle).toBe(ModelLifecycle.ACTIVE);
      expect(call.where.isExecutionCapable).toBe(true);
      expect(call.where.isRouterOnly).toBe(false);
    });

    it('honors excludeRouterOnly:false', async () => {
      prisma.routerModelRegistry.findMany!.mockResolvedValue([]);
      await repo.findExecutionCandidates({ excludeRouterOnly: false });
      const call = prisma.routerModelRegistry.findMany!.mock.calls[0]![0];
      expect(call.where.isRouterOnly).toBeUndefined();
    });

    it('requires every requested input modality', async () => {
      prisma.routerModelRegistry.findMany!.mockResolvedValue([]);
      await repo.findExecutionCandidates({
        requiredModalitiesIn: [ModalityKind.IMAGE_INPUT, ModalityKind.TEXT],
      });
      const call = prisma.routerModelRegistry.findMany!.mock.calls[0]![0];
      expect(call.where.modalitiesIn.hasEvery).toEqual([
        ModalityKind.IMAGE_INPUT,
        ModalityKind.TEXT,
      ]);
    });
  });

  describe('softDelete', () => {
    it('sets lifecycle=REMOVED, never hard-deletes', async () => {
      prisma.routerModelRegistry.update!.mockResolvedValue({
        ...baseFakeRow,
        lifecycle: ModelLifecycle.REMOVED,
      });
      const result = await repo.softDelete('r1');
      expect(prisma.routerModelRegistry.update).toHaveBeenCalledWith({
        where: { id: 'r1' },
        data: { lifecycle: ModelLifecycle.REMOVED },
      });
      expect(result.lifecycle).toBe(ModelLifecycle.REMOVED);
    });
  });

  describe('upsert', () => {
    it('uses composite key', async () => {
      prisma.routerModelRegistry.upsert!.mockResolvedValue(baseFakeRow);
      await repo.upsert('OPENAI', 'gpt-4o', baseFakeRow as never, {
        displayName: 'GPT-4o (renamed)',
      });
      const call = prisma.routerModelRegistry.upsert!.mock.calls[0]![0];
      expect(call.where.provider_modelKey).toEqual({
        provider: 'OPENAI',
        modelKey: 'gpt-4o',
      });
    });
  });
});
