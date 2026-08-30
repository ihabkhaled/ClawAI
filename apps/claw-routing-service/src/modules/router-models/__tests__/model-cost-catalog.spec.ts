import { ModelCostClass } from '@claw/shared-types';
import { ModelPricingSource } from '../../../common/enums';
import { ModelCostCatalogService } from '../services/model-cost-catalog.service';
import { type ModelCostService } from '../services/model-cost.service';
import { type RouterModelRegistryRepository } from '../repositories/router-model-registry.repository';
import { type ModelCostSnapshot } from '../types/model-cost.types';
import { type RouterModelCatalogEntry } from '../types/model-cost-catalog.types';
import { resolvePricingSource } from '../utilities/model-cost-catalog.utility';

const entry = (modelKey: string): RouterModelCatalogEntry => ({
  provider: 'OPENAI',
  modelKey,
  displayName: 'GPT-4o',
});

const snapshot = (overrides: Partial<ModelCostSnapshot> = {}): ModelCostSnapshot =>
  ({
    provider: 'OPENAI',
    model: 'gpt-4o',
    version: 3,
    currency: 'USD',
    inputPerMillionMicroUsd: 2_500_000,
    outputPerMillionMicroUsd: 10_000_000,
    cachedInputPerMillionMicroUsd: 1_250_000,
    cacheWritePerMillionMicroUsd: null,
    reasoningPerMillionMicroUsd: null,
    imagePerUnitMicroUsd: null,
    audioPerUnitMicroUsd: null,
    videoPerUnitMicroUsd: null,
    toolCallPerUnitMicroUsd: null,
    searchCallPerUnitMicroUsd: null,
    costClass: ModelCostClass.PREMIUM,
    isAdminOverride: false,
    effectiveFrom: '2026-07-01T00:00:00.000Z',
    lastVerifiedAt: '2026-07-20T00:00:00.000Z',
    source: 'SEED',
    isPriced: true,
    isFallbackRate: false,
    localComputeOwnership: null,
    ...overrides,
  }) as ModelCostSnapshot;

describe('resolvePricingSource', () => {
  it('reports a model that has its own active row as PUBLISHED', () => {
    expect(resolvePricingSource(entry('gpt-4o'), snapshot())).toBe(ModelPricingSource.PUBLISHED);
  });

  it('reports a fallback BEFORE anything else — every other field looks published', () => {
    const fallback = snapshot({ isFallbackRate: true, model: 'gpt-4o-mini', version: 2 });

    expect(resolvePricingSource(entry('gpt-nobody-priced'), fallback)).toBe(
      ModelPricingSource.PROVIDER_FALLBACK,
    );
  });

  it('reports a dated snapshot priced off its family as DATED_FAMILY', () => {
    const family = snapshot({ model: 'claude-haiku-4-5' });

    expect(resolvePricingSource(entry('claude-haiku-4-5-20251001'), family)).toBe(
      ModelPricingSource.DATED_FAMILY,
    );
  });

  it('treats a pure case difference as the same key, not an alias hit', () => {
    expect(resolvePricingSource(entry('GPT-4o'), snapshot({ model: 'gpt-4o' }))).toBe(
      ModelPricingSource.PUBLISHED,
    );
  });

  it('reports the synthesised local-compute rate as LOCAL_FREE', () => {
    const local = snapshot({
      version: 0,
      provider: 'OLLAMA',
      inputPerMillionMicroUsd: 0,
      outputPerMillionMicroUsd: 0,
      costClass: ModelCostClass.FREE,
    });

    expect(resolvePricingSource(entry('llama3.1'), local)).toBe(ModelPricingSource.LOCAL_FREE);
  });

  it('reports a synthesised empty snapshot as UNPRICED', () => {
    const empty = snapshot({
      version: 0,
      isPriced: false,
      inputPerMillionMicroUsd: null,
      outputPerMillionMicroUsd: null,
    });

    expect(resolvePricingSource(entry('gpt-unknown'), empty)).toBe(ModelPricingSource.UNPRICED);
  });

  it('reports a stored row with only half a price as UNPRICED', () => {
    const halfPriced = snapshot({ isPriced: false, outputPerMillionMicroUsd: null });

    expect(resolvePricingSource(entry('gpt-4o'), halfPriced)).toBe(ModelPricingSource.UNPRICED);
  });
});

describe('ModelCostCatalogService', () => {
  it('prices every registry row through getSnapshot, never its own lookup', async () => {
    const entries: RouterModelCatalogEntry[] = Array.from({ length: 20 }, (_, index) => ({
      provider: 'OPENAI',
      modelKey: `model-${index}`,
      displayName: `Model ${index}`,
    }));
    const registry = {
      listCatalogEntries: jest.fn().mockResolvedValue(entries),
    } as unknown as RouterModelRegistryRepository;
    const getSnapshot = jest.fn(async (provider: string, modelKey: string) =>
      snapshot({ provider, model: modelKey }),
    );
    const costs = { getSnapshot } as unknown as ModelCostService;

    const rows = await new ModelCostCatalogService(registry, costs).listCatalog();

    // Batching must not drop or duplicate a row: 20 entries straddle the
    // 16-wide batch, which is exactly where an off-by-one would hide.
    expect(rows).toHaveLength(20);
    expect(getSnapshot).toHaveBeenCalledTimes(20);
    expect(rows.map((row) => row.modelKey)).toEqual(entries.map((item) => item.modelKey));
    expect(rows[0]?.pricingSource).toBe(ModelPricingSource.PUBLISHED);
    expect(rows[0]?.inputPerMillionMicroUsd).toBe(2_500_000);
  });

  it('returns an empty catalogue rather than throwing on an empty registry', async () => {
    const registry = {
      listCatalogEntries: jest.fn().mockResolvedValue([]),
    } as unknown as RouterModelRegistryRepository;
    const costs = { getSnapshot: jest.fn() } as unknown as ModelCostService;

    await expect(new ModelCostCatalogService(registry, costs).listCatalog()).resolves.toEqual([]);
  });
});
