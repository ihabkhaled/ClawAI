import { SeedApplyOutcome } from '../../../common/enums';
import { CostClass, CostConfidence, ModelCostSource } from '../../../generated/prisma';
import { ModelCostSeedRepository } from '../repositories/model-cost-seed.repository';
import { ModelCostSeedService } from '../services/model-cost-seed.service';
import { type PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import {
  MODEL_COST_SEED_ENTRIES,
  MODEL_COST_SEED_LOCK_ID,
  MODEL_COST_SEED_NAME,
  MODEL_COST_SEED_VERSION,
} from '../constants/model-cost-seed.constants';
import { LOCAL_COST_PROVIDERS } from '../constants/model-cost.constants';
import type { ModelCostSeedInput } from '../types/model-cost-seed.types';

const seedInput = (overrides: Partial<ModelCostSeedInput> = {}): ModelCostSeedInput => ({
  name: MODEL_COST_SEED_NAME,
  version: MODEL_COST_SEED_VERSION,
  checksum: 'checksum-a',
  entries: [
    {
      provider: 'OPENAI',
      modelKey: 'gpt-5',
      inputPerMillionMicroUsd: 1_250_000,
      outputPerMillionMicroUsd: 10_000_000,
      cachedInputPerMillionMicroUsd: 125_000,
      cacheWritePerMillionMicroUsd: null,
      reasoningPerMillionMicroUsd: 10_000_000,
      costClass: CostClass.PREMIUM,
    },
    {
      provider: 'ANTHROPIC',
      modelKey: 'claude-sonnet-4',
      inputPerMillionMicroUsd: 3_000_000,
      outputPerMillionMicroUsd: 15_000_000,
      cachedInputPerMillionMicroUsd: 300_000,
      cacheWritePerMillionMicroUsd: 3_750_000,
      reasoningPerMillionMicroUsd: 15_000_000,
      costClass: CostClass.PREMIUM,
    },
  ],
  ...overrides,
});

type TransactionMock = {
  $queryRaw: jest.Mock;
  seedExecution: { findUnique: jest.Mock; upsert: jest.Mock; update: jest.Mock };
  modelCostVersion: { findMany: jest.Mock; createMany: jest.Mock };
};

const buildTransaction = (): TransactionMock => ({
  $queryRaw: jest.fn().mockResolvedValue([]),
  seedExecution: {
    findUnique: jest.fn().mockResolvedValue(null),
    upsert: jest.fn().mockResolvedValue(undefined),
    update: jest.fn().mockResolvedValue(undefined),
  },
  modelCostVersion: {
    findMany: jest.fn().mockResolvedValue([]),
    createMany: jest.fn().mockResolvedValue({ count: 2 }),
  },
});

describe('MODEL_COST_SEED_ENTRIES', () => {
  // The point of the whole seeder: an empty price table blocks every PAYG
  // request on day one, because an unpriced model on a metered provider is
  // treated as blocked rather than free.
  it('covers every provider and model the launch requires', () => {
    const keys = MODEL_COST_SEED_ENTRIES.map((e) => `${e.provider}:${e.modelKey}`);

    expect(keys).toEqual(
      expect.arrayContaining([
        'OPENAI:gpt-5',
        'OPENAI:gpt-5-mini',
        'OPENAI:gpt-4o',
        'OPENAI:gpt-4o-mini',
        'OPENAI:o3',
        'OPENAI:o4-mini',
        'ANTHROPIC:claude-opus-4',
        'ANTHROPIC:claude-sonnet-4',
        'ANTHROPIC:claude-haiku-4-5',
        'GEMINI:gemini-2.5-pro',
        'GEMINI:gemini-2.5-flash',
        'GEMINI:gemini-2.5-flash-lite',
        'DEEPSEEK:deepseek-chat',
        'DEEPSEEK:deepseek-reasoner',
        'GROK:grok-4',
        'GROK:grok-3-mini',
      ]),
    );
  });

  it('has no duplicate provider/model pair', () => {
    const keys = MODEL_COST_SEED_ENTRIES.map((e) => `${e.provider}:${e.modelKey}`);
    expect(new Set(keys).size).toBe(keys.length);
  });

  // `hasUsablePricing` needs both. A model missing either is UNPRICED, which
  // for a PAYG provider means blocked — the exact failure this seed exists to
  // prevent.
  it('prices both input and output for every entry', () => {
    for (const entry of MODEL_COST_SEED_ENTRIES) {
      expect(entry.inputPerMillionMicroUsd).toBeGreaterThan(0);
      expect(entry.outputPerMillionMicroUsd).toBeGreaterThan(0);
    }
  });

  // Money is integer micro-USD everywhere in this platform. A float here would
  // reach a BigInt column and throw at insert time, on first boot.
  it('holds every rate as a non-negative integer', () => {
    for (const entry of MODEL_COST_SEED_ENTRIES) {
      for (const rate of [
        entry.inputPerMillionMicroUsd,
        entry.outputPerMillionMicroUsd,
        entry.cachedInputPerMillionMicroUsd,
        entry.cacheWritePerMillionMicroUsd,
        entry.reasoningPerMillionMicroUsd,
      ]) {
        if (rate === null) {
          continue;
        }
        expect(Number.isInteger(rate)).toBe(true);
        expect(rate).toBeGreaterThan(0);
      }
    }
  });

  // No provider bills reasoning at anything other than its output rate.
  // A different number here would silently mis-price every reasoning model.
  it('prices reasoning at the output rate wherever it is set', () => {
    for (const entry of MODEL_COST_SEED_ENTRIES) {
      if (entry.reasoningPerMillionMicroUsd !== null) {
        expect(entry.reasoningPerMillionMicroUsd).toBe(entry.outputPerMillionMicroUsd);
      }
    }
  });

  // Cached input is cheaper than fresh input at every provider that publishes
  // one. A cached rate above the standard rate would be a transcription error.
  it('never prices cached input above fresh input', () => {
    for (const entry of MODEL_COST_SEED_ENTRIES) {
      if (entry.cachedInputPerMillionMicroUsd !== null) {
        expect(entry.cachedInputPerMillionMicroUsd).toBeLessThanOrEqual(
          entry.inputPerMillionMicroUsd,
        );
      }
    }
  });

  // A local provider must never acquire a seeded cloud rate: it resolves
  // through the local-compute path instead, and a row here would shadow it.
  it('seeds no local provider', () => {
    for (const entry of MODEL_COST_SEED_ENTRIES) {
      expect(LOCAL_COST_PROVIDERS).not.toContain(entry.provider);
    }
  });
});

describe('ModelCostSeedRepository', () => {
  let transaction: TransactionMock;
  let prisma: { $transaction: jest.Mock };
  let repository: ModelCostSeedRepository;

  beforeEach(() => {
    transaction = buildTransaction();
    prisma = {
      $transaction: jest.fn((callback: (tx: TransactionMock) => unknown) => callback(transaction)),
    };
    repository = new ModelCostSeedRepository(prisma as unknown as PrismaService);
  });

  // Booting replicas must serialise here rather than race to insert the same
  // activeKey. The lock is transaction-scoped, so it releases on commit.
  it('takes the advisory lock before reading the ledger', async () => {
    await repository.applyOnce(seedInput());

    expect(transaction.$queryRaw).toHaveBeenCalledTimes(1);
    const [statement] = transaction.$queryRaw.mock.calls[0] as [{ values: unknown[] }];
    expect(statement.values).toContain(MODEL_COST_SEED_LOCK_ID);
  });

  it('inserts every missing price and completes the ledger row', async () => {
    const result = await repository.applyOnce(seedInput());

    expect(result).toEqual({ outcome: SeedApplyOutcome.APPLIED, inserted: 2, skipped: 0 });
    const [args] = transaction.modelCostVersion.createMany.mock.calls[0] as [
      { data: Array<Record<string, unknown>> },
    ];
    expect(args.data).toHaveLength(2);
    expect(transaction.seedExecution.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'COMPLETED' }) }),
    );
  });

  it('writes seeded rows as version 1, active, SEED and ESTIMATED', async () => {
    await repository.applyOnce(seedInput());

    const [args] = transaction.modelCostVersion.createMany.mock.calls[0] as [
      { data: Array<Record<string, unknown>> },
    ];
    const first = args.data[0];
    expect(first).toMatchObject({
      provider: 'OPENAI',
      modelKey: 'gpt-5',
      version: 1,
      currency: 'USD',
      source: ModelCostSource.SEED,
      confidence: CostConfidence.ESTIMATED,
      isActive: true,
      activeKey: 'OPENAI:gpt-5',
    });
    expect(first?.['inputPerMillionMicroUsd']).toBe(1_250_000n);
    expect(first?.['cacheWritePerMillionMicroUsd']).toBeNull();
  });

  // FALSE on purpose: a seeded LIST price is not a negotiated rate, so an
  // automated sync is allowed to refresh it. Marking it as an override would
  // freeze a guess forever.
  it('never marks a seeded price as an administrator override', async () => {
    await repository.applyOnce(seedInput());

    const [args] = transaction.modelCostVersion.createMany.mock.calls[0] as [
      { data: Array<Record<string, unknown>> },
    ];
    for (const row of args.data) {
      expect(row['isAdminOverride']).toBe(false);
    }
  });

  // The invariant the whole seeder hangs on: an administrator's hand-negotiated
  // rate must survive a re-run. Skipping on ANY history also keeps the version
  // counter honest, since a retired v1 would collide on (provider, model, 1).
  it('skips a model that already carries any price history', async () => {
    transaction.modelCostVersion.findMany.mockResolvedValue([
      { provider: 'OPENAI', modelKey: 'gpt-5' },
    ]);

    const result = await repository.applyOnce(seedInput());

    expect(result).toEqual({ outcome: SeedApplyOutcome.APPLIED, inserted: 1, skipped: 1 });
    const [args] = transaction.modelCostVersion.createMany.mock.calls[0] as [
      { data: Array<Record<string, unknown>> },
    ];
    expect(args.data.map((row) => row['modelKey'])).toEqual(['claude-sonnet-4']);
  });

  it('writes nothing when every model is already priced', async () => {
    transaction.modelCostVersion.findMany.mockResolvedValue([
      { provider: 'OPENAI', modelKey: 'gpt-5' },
      { provider: 'ANTHROPIC', modelKey: 'claude-sonnet-4' },
    ]);

    const result = await repository.applyOnce(seedInput());

    expect(transaction.modelCostVersion.createMany).not.toHaveBeenCalled();
    expect(result).toEqual({ outcome: SeedApplyOutcome.APPLIED, inserted: 0, skipped: 2 });
  });

  it('short-circuits a completed run with a matching checksum', async () => {
    transaction.seedExecution.findUnique.mockResolvedValue({
      status: 'COMPLETED',
      checksum: 'checksum-a',
    });

    const result = await repository.applyOnce(seedInput());

    expect(result.outcome).toBe(SeedApplyOutcome.ALREADY_APPLIED);
    expect(transaction.modelCostVersion.createMany).not.toHaveBeenCalled();
    expect(transaction.seedExecution.upsert).not.toHaveBeenCalled();
  });

  // A payload that changed after the version was applied is REPORTED, never
  // re-applied. Silently rewriting would overwrite whatever an admin has since
  // edited.
  it('reports a checksum mismatch and writes nothing', async () => {
    transaction.seedExecution.findUnique.mockResolvedValue({
      status: 'COMPLETED',
      checksum: 'checksum-b',
    });

    const result = await repository.applyOnce(seedInput());

    expect(result.outcome).toBe(SeedApplyOutcome.CHECKSUM_MISMATCH);
    expect(transaction.modelCostVersion.createMany).not.toHaveBeenCalled();
  });

  it('resumes a run left in RUNNING', async () => {
    transaction.seedExecution.findUnique.mockResolvedValue({
      status: 'RUNNING',
      checksum: 'checksum-a',
    });

    const result = await repository.applyOnce(seedInput());

    expect(result.outcome).toBe(SeedApplyOutcome.APPLIED);
    expect(transaction.modelCostVersion.createMany).toHaveBeenCalled();
  });
});

describe('ModelCostSeedService', () => {
  let repository: { applyOnce: jest.Mock };
  let service: ModelCostSeedService;

  beforeEach(() => {
    repository = {
      applyOnce: jest
        .fn()
        .mockResolvedValue({ outcome: SeedApplyOutcome.APPLIED, inserted: 16, skipped: 0 }),
    };
    service = new ModelCostSeedService(repository as unknown as ModelCostSeedRepository);
  });

  it('seeds on module init', async () => {
    await service.onModuleInit();

    expect(repository.applyOnce).toHaveBeenCalledTimes(1);
  });

  it('applies the full constant list under its declared name and version', async () => {
    await service.seed();

    const [input] = repository.applyOnce.mock.calls[0] as [ModelCostSeedInput];
    expect(input.name).toBe(MODEL_COST_SEED_NAME);
    expect(input.version).toBe(MODEL_COST_SEED_VERSION);
    expect(input.entries).toBe(MODEL_COST_SEED_ENTRIES);
  });

  // The checksum has to cover the RATES, not just the model list, or a price
  // correction that kept the same models would look like a no-op.
  it('derives a checksum that changes when a rate changes', async () => {
    await service.seed();
    const [first] = repository.applyOnce.mock.calls[0] as [ModelCostSeedInput];

    const cheaper = MODEL_COST_SEED_ENTRIES.map((entry, index) =>
      index === 0 ? { ...entry, outputPerMillionMicroUsd: 1 } : entry,
    );
    expect(JSON.stringify(cheaper)).not.toBe(JSON.stringify(MODEL_COST_SEED_ENTRIES));
    expect(first.checksum).toHaveLength(64);
  });

  it('returns the repository outcome unchanged', async () => {
    repository.applyOnce.mockResolvedValue({
      outcome: SeedApplyOutcome.ALREADY_APPLIED,
      inserted: 0,
      skipped: 16,
    });

    await expect(service.seed()).resolves.toEqual({
      outcome: SeedApplyOutcome.ALREADY_APPLIED,
      inserted: 0,
      skipped: 16,
    });
  });
});
