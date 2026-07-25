import { ModelCostService } from '../services/model-cost.service';
import { type ModelCostRepository } from '../repositories/model-cost.repository';
import { type PublishModelCostInput } from '../types/model-cost.types';
import { AppConfig } from '../../../app/config/app.config';
import { CostClass, CostConfidence, ModelCostSource } from '../../../generated/prisma';

const baseRecord = (overrides: Record<string, unknown> = {}) => ({
  id: 'c1',
  provider: 'OPENAI',
  modelKey: 'gpt-4o',
  version: 3,
  currency: 'USD',
  inputPerMillionMicroUsd: 2_500_000n,
  outputPerMillionMicroUsd: 10_000_000n,
  cachedInputPerMillionMicroUsd: 1_250_000n,
  cacheWritePerMillionMicroUsd: null,
  reasoningPerMillionMicroUsd: null,
  imagePerUnitMicroUsd: null,
  audioPerUnitMicroUsd: null,
  videoPerUnitMicroUsd: null,
  toolCallPerUnitMicroUsd: null,
  searchCallPerUnitMicroUsd: null,
  costClass: 'PREMIUM',
  confidence: 'EXACT',
  source: 'PROVIDER_SYNC',
  isAdminOverride: false,
  localComputeOwnership: null,
  isActive: true,
  activeKey: 'OPENAI:gpt-4o',
  effectiveFrom: new Date('2026-07-01T00:00:00.000Z'),
  retiredAt: null,
  lastVerifiedAt: new Date('2026-07-20T00:00:00.000Z'),
  createdAt: new Date('2026-07-01T00:00:00.000Z'),
  createdByUserId: null,
  notes: null,
  ...overrides,
});

const syncInput = (overrides: Partial<PublishModelCostInput> = {}): PublishModelCostInput => ({
  provider: 'OPENAI',
  modelKey: 'gpt-4o',
  currency: 'USD',
  inputPerMillionMicroUsd: 2_500_000n,
  outputPerMillionMicroUsd: 10_000_000n,
  cachedInputPerMillionMicroUsd: 1_250_000n,
  cacheWritePerMillionMicroUsd: null,
  reasoningPerMillionMicroUsd: null,
  imagePerUnitMicroUsd: null,
  audioPerUnitMicroUsd: null,
  videoPerUnitMicroUsd: null,
  toolCallPerUnitMicroUsd: null,
  searchCallPerUnitMicroUsd: null,
  costClass: CostClass.PREMIUM,
  confidence: CostConfidence.ESTIMATED,
  source: ModelCostSource.PROVIDER_SYNC,
  isAdminOverride: false,
  localComputeOwnership: null,
  createdByUserId: null,
  notes: null,
  ...overrides,
});

const mockConfig = (ownership: string, rate: number): void => {
  jest.spyOn(AppConfig, 'get').mockReturnValue({
    LOCAL_COMPUTE_OWNERSHIP: ownership,
    LOCAL_COMPUTE_COST_PER_MILLION_MICRO_USD: rate,
  } as unknown as ReturnType<typeof AppConfig.get>);
};

describe('ModelCostService', () => {
  let service: ModelCostService;
  let repository: {
    findActive: jest.Mock;
    listActive: jest.Mock;
    listVersions: jest.Mock;
    publish: jest.Mock;
    touchVerified: jest.Mock;
  };

  beforeEach(() => {
    repository = {
      findActive: jest.fn(),
      listActive: jest.fn(),
      listVersions: jest.fn(),
      publish: jest.fn().mockResolvedValue({ version: 4 }),
      touchVerified: jest.fn(),
    };
    service = new ModelCostService(repository as unknown as ModelCostRepository);
    mockConfig('USER_OWNED', 0);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('getSnapshot', () => {
    it('returns the active versioned rates as a priced snapshot', async () => {
      repository.findActive.mockResolvedValue(baseRecord());
      const snapshot = await service.getSnapshot('OPENAI', 'gpt-4o');
      expect(snapshot).toMatchObject({
        provider: 'OPENAI',
        model: 'gpt-4o',
        version: 3,
        inputPerMillionMicroUsd: 2_500_000,
        outputPerMillionMicroUsd: 10_000_000,
        costClass: 'PREMIUM',
        isPriced: true,
      });
    });

    it('marks a cloud model with no registry row as UNPRICED, not free', async () => {
      // An unpriced model is unbounded provider spend. Treating it as free would
      // let a limited plan run the most expensive model in the catalog.
      repository.findActive.mockResolvedValue(null);
      const snapshot = await service.getSnapshot('ANTHROPIC', 'claude-opus-5');
      expect(snapshot.isPriced).toBe(false);
      expect(snapshot.inputPerMillionMicroUsd).toBeNull();
    });

    it('marks a half-priced row as UNPRICED when only the input rate is known', async () => {
      repository.findActive.mockResolvedValue(baseRecord({ outputPerMillionMicroUsd: null }));
      const snapshot = await service.getSnapshot('OPENAI', 'gpt-4o');
      expect(snapshot.isPriced).toBe(false);
    });

    it('prices user-owned local compute at zero', async () => {
      repository.findActive.mockResolvedValue(null);
      mockConfig('USER_OWNED', 0);
      const snapshot = await service.getSnapshot('OLLAMA', 'gemma3:4b');
      expect(snapshot).toMatchObject({
        isPriced: true,
        inputPerMillionMicroUsd: 0,
        outputPerMillionMicroUsd: 0,
        costClass: 'FREE',
        localComputeOwnership: 'USER_OWNED',
      });
    });

    it('prices platform-hosted local compute at the configured rate', async () => {
      repository.findActive.mockResolvedValue(null);
      mockConfig('PLATFORM_HOSTED', 40_000);
      const snapshot = await service.getSnapshot('LLAMACPP', 'kimi-k2');
      expect(snapshot).toMatchObject({
        isPriced: true,
        inputPerMillionMicroUsd: 40_000,
        outputPerMillionMicroUsd: 40_000,
        costClass: 'CHEAP',
        localComputeOwnership: 'PLATFORM_HOSTED',
      });
    });

    it('fails CLOSED when hosting local compute with a zero cost estimate', async () => {
      // Someone pays for that GPU. A zero rate here is a misconfiguration, and
      // treating it as free would serve unlimited uncosted inference.
      repository.findActive.mockResolvedValue(null);
      mockConfig('PLATFORM_HOSTED', 0);
      const snapshot = await service.getSnapshot('OLLAMA', 'gemma3:4b');
      expect(snapshot.isPriced).toBe(false);
    });

    it('recognises local providers case-insensitively', async () => {
      repository.findActive.mockResolvedValue(null);
      mockConfig('USER_OWNED', 0);
      const snapshot = await service.getSnapshot('ollama', 'gemma3:4b');
      expect(snapshot.isPriced).toBe(true);
    });
  });

  describe('applySyncedRates', () => {
    it('refuses to overwrite an active administrator override', async () => {
      // A nightly scrape must never replace a hand-negotiated enterprise rate.
      repository.findActive.mockResolvedValue(baseRecord({ isAdminOverride: true }));
      const result = await service.applySyncedRates(syncInput());
      expect(result).toEqual({ applied: false, reason: 'ADMIN_OVERRIDE_ACTIVE' });
      expect(repository.publish).not.toHaveBeenCalled();
    });

    it('refreshes verification instead of minting a version when rates are unchanged', async () => {
      repository.findActive.mockResolvedValue(baseRecord());
      const result = await service.applySyncedRates(syncInput());
      expect(result).toEqual({ applied: false, reason: 'RATES_UNCHANGED' });
      expect(repository.touchVerified).toHaveBeenCalledWith('c1');
      expect(repository.publish).not.toHaveBeenCalled();
    });

    it('publishes a new version when a rate actually changed', async () => {
      repository.findActive.mockResolvedValue(baseRecord());
      const result = await service.applySyncedRates(
        syncInput({ outputPerMillionMicroUsd: 12_000_000n }),
      );
      expect(result).toEqual({ applied: true, version: 4 });
      expect(repository.publish).toHaveBeenCalledTimes(1);
    });

    it('publishes when no active row exists yet', async () => {
      repository.findActive.mockResolvedValue(null);
      const result = await service.applySyncedRates(syncInput());
      expect(result).toEqual({ applied: true, version: 4 });
    });

    it('never marks a synced publish as an admin override', async () => {
      repository.findActive.mockResolvedValue(null);
      await service.applySyncedRates(syncInput({ isAdminOverride: true }));
      expect(repository.publish).toHaveBeenCalledWith(
        expect.objectContaining({ isAdminOverride: false }),
      );
    });
  });

  describe('estimate', () => {
    it('prices the worst case from prompt and max output tokens', async () => {
      repository.findActive.mockResolvedValue(baseRecord());
      const quote = await service.estimate({
        provider: 'OPENAI',
        modelKey: 'gpt-4o',
        promptTokens: 1_000,
        maxOutputTokens: 1_000,
      });
      // 1000 * 2.5 + 1000 * 10 = 12,500 micro-USD, and 1 micro-USD == 1
      // weighted token by the normalization identity.
      expect(quote).toEqual({ weightedTokens: 12_500, costMicroUsd: 12_500, isPriced: true });
    });

    it('reports isPriced false rather than a zero cost for an unpriced model', async () => {
      repository.findActive.mockResolvedValue(null);
      const quote = await service.estimate({
        provider: 'ANTHROPIC',
        modelKey: 'unknown-model',
        promptTokens: 1_000,
        maxOutputTokens: 1_000,
      });
      expect(quote.isPriced).toBe(false);
    });
  });

  describe('price', () => {
    it('prices measured usage including the cheaper cached-input rate', async () => {
      repository.findActive.mockResolvedValue(baseRecord());
      const quote = await service.price({
        provider: 'OPENAI',
        modelKey: 'gpt-4o',
        raw: {
          inputTokens: 1_000,
          cachedInputTokens: 1_000,
          reasoningTokens: 0,
          outputTokens: 500,
          toolCalls: 0,
          searchCalls: 0,
        },
      });
      // 1000*2.5 + 1000*1.25 + 500*10 = 2500 + 1250 + 5000
      expect(quote.costMicroUsd).toBe(8_750);
      expect(quote.weightedTokens).toBe(8_750);
    });

    it('falls back to the standard input rate when no cached rate is published', async () => {
      repository.findActive.mockResolvedValue(baseRecord({ cachedInputPerMillionMicroUsd: null }));
      const quote = await service.price({
        provider: 'OPENAI',
        modelKey: 'gpt-4o',
        raw: {
          inputTokens: 0,
          cachedInputTokens: 1_000,
          reasoningTokens: 0,
          outputTokens: 0,
          toolCalls: 0,
          searchCalls: 0,
        },
      });
      // "We don't know" must not round down to free.
      expect(quote.costMicroUsd).toBe(2_500);
    });

    it('reports isPriced false for an unpriced model', async () => {
      repository.findActive.mockResolvedValue(null);
      const quote = await service.price({
        provider: 'GROK',
        modelKey: 'grok-4',
        raw: {
          inputTokens: 100,
          cachedInputTokens: 0,
          reasoningTokens: 0,
          outputTokens: 100,
          toolCalls: 0,
          searchCalls: 0,
        },
      });
      expect(quote).toEqual({ weightedTokens: 0, costMicroUsd: 0, isPriced: false });
    });
  });

  it('publish returns the newly minted version', async () => {
    const version = await service.publish(syncInput());
    expect(version).toBe(4);
  });
});
