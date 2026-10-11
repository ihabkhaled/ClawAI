import { type Mock, vi } from 'vitest';
import { type RabbitMQService } from '@claw/shared-rabbitmq';
import { ModelCostClass } from '@claw/shared-types';
import { AppConfig } from '../../../app/config/app.config';
import { ModelPriceBasis, ModelPricingSource } from '../../../common/enums';
import { type ModelCostVersion } from '../../../generated/prisma';
import { MODEL_COST_SEED_ENTRIES } from '../constants/model-cost-seed.constants';
import { LOCAL_COST_PROVIDERS } from '../constants/model-cost.constants';
import { type ModelCostRepository } from '../repositories/model-cost.repository';
import { type RouterModelRegistryRepository } from '../repositories/router-model-registry.repository';
import { ModelCostCatalogService } from '../services/model-cost-catalog.service';
import { ModelCostService } from '../services/model-cost.service';
import { type ModelCostSnapshot } from '../types/model-cost.types';
import { resolvePriceBasis } from '../utilities/model-cost-catalog.utility';
import { buildSyncedPriceInput, isRejection } from '../utilities/synced-model-price.utility';
import { paginateUnpriced } from '../utilities/unpriced-model-page.utility';

vi.mock('../utilities/connector-exposed-models.utility', () => ({
  fetchExposedConnectorModels: vi.fn().mockResolvedValue([]),
}));

const record = (overrides: Partial<ModelCostVersion> = {}): ModelCostVersion =>
  ({
    id: 'c1',
    provider: 'OPENAI',
    modelKey: 'gpt-4o',
    version: 3,
    currency: 'USD',
    inputPerMillionMicroUsd: 2_500_000n,
    outputPerMillionMicroUsd: 10_000_000n,
    cachedInputPerMillionMicroUsd: 1_250_000n,
    cacheWritePerMillionMicroUsd: 3_000_000n,
    reasoningPerMillionMicroUsd: null,
    imagePerUnitMicroUsd: null,
    audioPerUnitMicroUsd: null,
    videoPerUnitMicroUsd: null,
    toolCallPerUnitMicroUsd: null,
    searchCallPerUnitMicroUsd: null,
    ttsPerCharacterMicroUsd: null,
    costClass: 'PREMIUM',
    confidence: 'ESTIMATED',
    source: 'SEED',
    isAdminOverride: false,
    localComputeOwnership: null,
    isActive: true,
    activeKey: 'OPENAI:gpt-4o',
    effectiveFrom: new Date('2026-07-01T00:00:00.000Z'),
    retiredAt: null,
    lastVerifiedAt: null,
    createdAt: new Date('2026-07-01T00:00:00.000Z'),
    createdByUserId: null,
    notes: null,
    ...overrides,
  }) as ModelCostVersion;

const prices = (overrides: Record<string, number | undefined> = {}) => ({
  provider: 'OPENAI',
  modelKey: 'gpt-4o',
  inputPerMillionMicroUsd: 2_600_000,
  outputPerMillionMicroUsd: 10_400_000,
  cachedInputPerMillionMicroUsd: undefined as number | undefined,
  ...overrides,
});

describe('buildSyncedPriceInput', () => {
  it('supersedes a SEED row and carries unpublished columns over', () => {
    const built = buildSyncedPriceInput(prices(), record());

    expect(isRejection(built)).toBe(false);
    expect(built).toMatchObject({
      source: 'PROVIDER_SYNC',
      isAdminOverride: false,
      inputPerMillionMicroUsd: 2_600_000n,
      outputPerMillionMicroUsd: 10_400_000n,
      cachedInputPerMillionMicroUsd: 1_250_000n,
      cacheWritePerMillionMicroUsd: 3_000_000n,
      costClass: 'PREMIUM',
    });
  });

  it('creates a priced row when none exists', () => {
    const built = buildSyncedPriceInput(prices(), null);

    expect(built).toMatchObject({ costClass: 'STANDARD', inputPerMillionMicroUsd: 2_600_000n });
  });

  it('never replaces an administrator override', () => {
    expect(buildSyncedPriceInput(prices(), record({ isAdminOverride: true }))).toEqual({
      applied: false,
      reason: 'ADMIN_OVERRIDE_ACTIVE',
    });
    expect(buildSyncedPriceInput(prices(), record({ source: 'ADMIN_OVERRIDE' }))).toEqual({
      applied: false,
      reason: 'ADMIN_OVERRIDE_ACTIVE',
    });
  });

  it('never replaces a provider-reported cost', () => {
    expect(buildSyncedPriceInput(prices(), record({ source: 'PROVIDER_REPORTED' }))).toEqual({
      applied: false,
      reason: 'PROVIDER_REPORTED_ACTIVE',
    });
  });

  it.each([
    ['zero input', { inputPerMillionMicroUsd: 0 }],
    ['negative output', { outputPerMillionMicroUsd: -5 }],
    ['missing output', { outputPerMillionMicroUsd: undefined }],
    ['fractional input', { inputPerMillionMicroUsd: 1.5 }],
    ['NaN', { inputPerMillionMicroUsd: Number.NaN }],
    ['over $1000 per Mtok', { inputPerMillionMicroUsd: 2_000_000_000 }],
    ['zero cached', { cachedInputPerMillionMicroUsd: 0 }],
  ])('refuses %s', (_label, override) => {
    expect(buildSyncedPriceInput(prices(override), record())).toEqual({
      applied: false,
      reason: 'INVALID_PRICE',
    });
  });

  it('refuses to describe a per-unit (image) row with a token price', () => {
    expect(buildSyncedPriceInput(prices(), record({ imagePerUnitMicroUsd: 40_000n }))).toEqual({
      applied: false,
      reason: 'NOT_A_TOKEN_MODEL',
    });
  });

  it('holds back a 20x+ move as a likely unit error', () => {
    expect(
      buildSyncedPriceInput(prices({ inputPerMillionMicroUsd: 90_000_000 }), record()),
    ).toEqual({ applied: false, reason: 'IMPLAUSIBLE_CHANGE' });
    expect(buildSyncedPriceInput(prices({ outputPerMillionMicroUsd: 100_000 }), record())).toEqual({
      applied: false,
      reason: 'IMPLAUSIBLE_CHANGE',
    });
  });
});

describe('ModelCostService.applyPublishedPrices', () => {
  let repository: { findActive: Mock; publish: Mock; touchVerified: Mock };
  let rabbit: { publish: Mock };
  let service: ModelCostService;

  beforeEach(() => {
    repository = {
      findActive: vi.fn(),
      publish: vi.fn().mockResolvedValue({ version: 4 }),
      touchVerified: vi.fn().mockResolvedValue(undefined),
    };
    rabbit = { publish: vi.fn().mockResolvedValue(undefined) };
    service = new ModelCostService(
      repository as unknown as ModelCostRepository,
      rabbit as unknown as RabbitMQService,
    );
  });

  it('publishes a PROVIDER_SYNC version over a SEED row and announces it', async () => {
    repository.findActive.mockResolvedValue(record());

    const outcome = await service.applyPublishedPrices(prices());

    expect(outcome).toEqual({ applied: true, version: 4 });
    expect(repository.publish).toHaveBeenCalledWith(
      expect.objectContaining({ source: 'PROVIDER_SYNC', isAdminOverride: false }),
    );
    expect(rabbit.publish).toHaveBeenCalledTimes(1);
  });

  it('is idempotent: identical prices touch verification and publish nothing', async () => {
    repository.findActive.mockResolvedValue(
      record({
        source: 'PROVIDER_SYNC',
        inputPerMillionMicroUsd: 2_600_000n,
        outputPerMillionMicroUsd: 10_400_000n,
      }),
    );

    const outcome = await service.applyPublishedPrices(prices());

    expect(outcome).toEqual({ applied: false, reason: 'RATES_UNCHANGED' });
    expect(repository.publish).not.toHaveBeenCalled();
    expect(rabbit.publish).not.toHaveBeenCalled();
    expect(repository.touchVerified).toHaveBeenCalledWith('c1');
  });

  it('writes nothing for an admin-pinned model or an invalid price', async () => {
    repository.findActive.mockResolvedValue(record({ isAdminOverride: true }));
    await service.applyPublishedPrices(prices());
    repository.findActive.mockResolvedValue(null);
    await service.applyPublishedPrices(prices({ inputPerMillionMicroUsd: 0 }));

    expect(repository.publish).not.toHaveBeenCalled();
  });
});

describe('ModelCostService fallback pricing', () => {
  let repository: { findActive: Mock; findMostExpensiveForProvider: Mock };
  let service: ModelCostService;

  beforeEach(() => {
    vi.spyOn(AppConfig, 'get').mockReturnValue({
      PAYG_FALLBACK_PRICING_ENABLED: true,
      LOCAL_COMPUTE_OWNERSHIP: 'USER_OWNED',
      LOCAL_COMPUTE_COST_PER_MILLION_MICRO_USD: 0,
    } as unknown as ReturnType<typeof AppConfig.get>);
    repository = {
      findActive: vi.fn().mockResolvedValue(null),
      findMostExpensiveForProvider: vi.fn().mockResolvedValue(record()),
    };
    service = new ModelCostService(repository as unknown as ModelCostRepository);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('still falls back for a first-party provider', async () => {
    const snapshot = await service.getSnapshot('OPENAI', 'gpt-nobody-priced');

    expect(snapshot).toMatchObject({ isPriced: true, isFallbackRate: true });
  });

  it.each([
    'OPENROUTER',
    'HUGGING_FACE',
    'NVIDIA_NIM',
    'POLLINATIONS',
    'AI_HORDE',
    'CUSTOM_OPENAI_COMPATIBLE',
    'custom_acme',
  ])('leaves %s models UNPRICED instead of guessing', async (provider) => {
    const snapshot = await service.getSnapshot(provider, 'some/model');

    expect(snapshot.isPriced).toBe(false);
    expect(snapshot.isFallbackRate).toBe(false);
    expect(repository.findMostExpensiveForProvider).not.toHaveBeenCalled();
  });
});

describe('ModelCostRepository.findMostExpensiveForProvider ranking', () => {
  it('ranks by combined input+output, text-chat rows only', async () => {
    const { ModelCostRepository } = await import('../repositories/model-cost.repository');
    const cheapInputDearOutput = record({
      modelKey: 'reasoner',
      inputPerMillionMicroUsd: 2_000_000n,
      outputPerMillionMicroUsd: 60_000_000n,
    });
    const dearInputCheapOutput = record({
      modelKey: 'gpt-4o',
      inputPerMillionMicroUsd: 5_000_000n,
      outputPerMillionMicroUsd: 8_000_000n,
    });
    const findMany = vi.fn().mockResolvedValue([dearInputCheapOutput, cheapInputDearOutput]);
    const repository = new ModelCostRepository({
      modelCostVersion: { findMany },
    } as unknown as ConstructorParameters<typeof ModelCostRepository>[0]);

    const dearest = await repository.findMostExpensiveForProvider('OPENAI');

    expect(dearest?.modelKey).toBe('reasoner');
    expect(findMany).toHaveBeenCalledWith({
      where: expect.objectContaining({
        provider: 'OPENAI',
        isActive: true,
        inputPerMillionMicroUsd: { gt: 0n },
        outputPerMillionMicroUsd: { gt: 0n },
        imagePerUnitMicroUsd: null,
        audioPerUnitMicroUsd: null,
        videoPerUnitMicroUsd: null,
        ttsPerCharacterMicroUsd: null,
      }),
    });
  });

  it('returns null when the provider has no chat-priced row', async () => {
    const { ModelCostRepository } = await import('../repositories/model-cost.repository');
    const repository = new ModelCostRepository({
      modelCostVersion: { findMany: vi.fn().mockResolvedValue([]) },
    } as unknown as ConstructorParameters<typeof ModelCostRepository>[0]);

    await expect(repository.findMostExpensiveForProvider('GROQ')).resolves.toBeNull();
  });
});

const snapshot = (overrides: Partial<ModelCostSnapshot> = {}): ModelCostSnapshot =>
  ({
    provider: 'OPENAI',
    model: 'gpt-4o',
    version: 2,
    currency: 'USD',
    inputPerMillionMicroUsd: 1,
    outputPerMillionMicroUsd: 1,
    costClass: ModelCostClass.STANDARD,
    isAdminOverride: false,
    source: 'SEED',
    isPriced: true,
    isFallbackRate: false,
    localComputeOwnership: null,
    ...overrides,
  }) as ModelCostSnapshot;

describe('resolvePriceBasis', () => {
  it('labels provider-sourced rows PUBLISHED-by-provider and seed rows ESTIMATED', () => {
    expect(resolvePriceBasis(snapshot({ source: 'PROVIDER_SYNC' }))).toBe(
      ModelPriceBasis.PROVIDER_PUBLISHED,
    );
    expect(resolvePriceBasis(snapshot({ source: 'PROVIDER_REPORTED' }))).toBe(
      ModelPriceBasis.PROVIDER_PUBLISHED,
    );
    expect(resolvePriceBasis(snapshot({ source: 'SEED' }))).toBe(ModelPriceBasis.ESTIMATED);
    expect(resolvePriceBasis(snapshot({ source: 'ADMIN_OVERRIDE', isAdminOverride: true }))).toBe(
      ModelPriceBasis.ADMIN_SET,
    );
  });

  it('gives a fallback or unpriced snapshot no basis', () => {
    expect(resolvePriceBasis(snapshot({ isFallbackRate: true }))).toBeNull();
    expect(resolvePriceBasis(snapshot({ isPriced: false }))).toBeNull();
    expect(resolvePriceBasis(snapshot({ version: 0 }))).toBeNull();
  });
});

describe('paginateUnpriced', () => {
  const rows = ['b', 'a', 'c'].map((key) => ({
    provider: 'GROQ',
    modelKey: `model-${key}`,
    displayName: key === 'c' ? 'Special' : null,
    pricingSource: ModelPricingSource.UNPRICED,
    inRegistry: true,
  }));

  it('sorts, slices and reports the total', () => {
    const page = paginateUnpriced(rows, 2, 2, undefined);

    expect(page.total).toBe(3);
    expect(page.items.map((row) => row.modelKey)).toEqual(['model-c']);
  });

  it('searches provider, key and display name case-insensitively', () => {
    expect(paginateUnpriced(rows, 1, 10, 'SPECIAL').items).toHaveLength(1);
    expect(paginateUnpriced(rows, 1, 10, 'groq').total).toBe(3);
    expect(paginateUnpriced(rows, 1, 10, 'zzz').total).toBe(0);
  });
});

describe('ModelCostCatalogService unpriced list and coverage audit', () => {
  const entries = [
    { provider: 'GROQ', modelKey: 'llama-x', displayName: 'Llama X' },
    { provider: 'OPENAI', modelKey: 'gpt-4o', displayName: null },
    { provider: 'OLLAMA', modelKey: 'gemma', displayName: null },
  ];

  function build(): { catalog: ModelCostCatalogService; costs: { getSnapshot: Mock } } {
    const costs = {
      getSnapshot: vi.fn(async (provider: string, modelKey: string) => {
        return provider === 'OPENAI' ? snapshot({ provider, model: modelKey, source: 'PROVIDER_SYNC' }) : snapshot({ provider, model: modelKey, version: 0, isPriced: false });
      }),
    };
    const registry = { listCatalogEntries: vi.fn().mockResolvedValue(entries) };
    const catalog = new ModelCostCatalogService(
      registry as unknown as RouterModelRegistryRepository,
      costs as unknown as ModelCostService,
    );
    return { catalog, costs };
  }

  it('lists only unpriced, non-local models and flags them', async () => {
    const { catalog } = build();

    const page = await catalog.listUnpriced(1, 50);

    expect(page.items.map((row) => `${row.provider}/${row.modelKey}`)).toEqual(['GROQ/llama-x']);
    expect(page.items[0]?.inRegistry).toBe(true);
  });

  it('includes connector-exposed models that have no registry row', async () => {
    const { fetchExposedConnectorModels } =
      await import('../utilities/connector-exposed-models.utility');
    vi.mocked(fetchExposedConnectorModels).mockResolvedValueOnce([
      { provider: 'POLLINATIONS', modelKey: 'flux', displayName: 'Flux' },
      { provider: 'GROQ', modelKey: 'llama-x', displayName: 'Llama X' },
    ]);
    const { catalog } = build();

    const page = await catalog.listUnpriced(1, 50);

    expect(page.items.map((row) => `${row.provider}/${row.modelKey}`)).toEqual([
      'GROQ/llama-x',
      'POLLINATIONS/flux',
    ]);
    expect(page.items[1]?.inRegistry).toBe(false);
  });

  it('warns with the count and names when a credit-billed model has no price', async () => {
    const { catalog } = build();
    const warn = vi.spyOn(catalog['logger'], 'warn').mockImplementation(() => {});

    const result = await catalog.auditCoverage();

    expect(result).toEqual({ unpriced: 1, fallback: 0 });
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('GROQ/llama-x'));
  });
});

describe('model-cost seed coverage', () => {
  it('prices every seeded model: tokens in+out, or a unit price', () => {
    const holes = MODEL_COST_SEED_ENTRIES.filter((entry) => {
      const tokenPriced =
        (entry.inputPerMillionMicroUsd ?? 0) > 0 && (entry.outputPerMillionMicroUsd ?? 0) > 0;
      const unitPriced = [
        entry.imagePerUnitMicroUsd,
        entry.audioPerUnitMicroUsd,
        entry.videoPerUnitMicroUsd,
        entry.ttsPerCharacterMicroUsd,
      ].some((value) => (value ?? 0) > 0);
      const local = LOCAL_COST_PROVIDERS.includes(entry.provider.toUpperCase());
      return !tokenPriced && !unitPriced && !local;
    }).map((entry) => `${entry.provider}/${entry.modelKey}`);

    expect(holes).toEqual([]);
  });

  it('has no duplicate provider/model keys', () => {
    const keys = MODEL_COST_SEED_ENTRIES.map((entry) => `${entry.provider}:${entry.modelKey}`);

    expect(new Set(keys).size).toBe(keys.length);
  });
});
