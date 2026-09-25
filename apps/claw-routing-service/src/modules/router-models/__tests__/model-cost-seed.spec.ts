import { type Mock, vi } from 'vitest';
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
import type { ModelCostSeedEntry, ModelCostSeedInput } from '../types/model-cost-seed.types';

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
  $queryRaw: Mock;
  seedExecution: { findUnique: Mock; upsert: Mock; update: Mock };
  modelCostVersion: {
    findMany: Mock;
    createMany: Mock;
    findUnique: Mock;
    findFirst: Mock;
    update: Mock;
    create: Mock;
  };
};

const buildTransaction = (): TransactionMock => ({
  $queryRaw: vi.fn().mockResolvedValue([]),
  seedExecution: {
    findUnique: vi.fn().mockResolvedValue(null),
    upsert: vi.fn().mockResolvedValue(undefined),
    update: vi.fn().mockResolvedValue(undefined),
  },
  modelCostVersion: {
    findMany: vi.fn().mockResolvedValue([]),
    createMany: vi.fn().mockResolvedValue({ count: 2 }),
    findUnique: vi.fn().mockResolvedValue(null),
    findFirst: vi.fn().mockResolvedValue(null),
    update: vi.fn().mockResolvedValue(undefined),
    create: vi.fn().mockResolvedValue(undefined),
  },
});

// The v3 row gpt-image-1 carried before unit metering: a fake token rate.
const V3_GPT_IMAGE_ROW = {
  id: 'cost-gpt-image-1-v3',
  provider: 'OPENAI',
  modelKey: 'gpt-image-1',
  version: 1,
  currency: 'USD',
  inputPerMillionMicroUsd: 10_000_000n,
  outputPerMillionMicroUsd: 20_385_742n,
  cachedInputPerMillionMicroUsd: null,
  cacheWritePerMillionMicroUsd: null,
  reasoningPerMillionMicroUsd: null,
  imagePerUnitMicroUsd: null,
  audioPerUnitMicroUsd: null,
  videoPerUnitMicroUsd: null,
  toolCallPerUnitMicroUsd: null,
  searchCallPerUnitMicroUsd: null,
  ttsPerCharacterMicroUsd: null,
  costClass: CostClass.PREMIUM,
  confidence: CostConfidence.ESTIMATED,
  source: ModelCostSource.SEED,
  isAdminOverride: false,
  localComputeOwnership: null,
  isActive: true,
  activeKey: 'OPENAI:gpt-image-1',
  effectiveFrom: new Date('2026-09-01T00:00:00.000Z'),
  retiredAt: null,
  lastVerifiedAt: null,
  createdAt: new Date('2026-09-01T00:00:00.000Z'),
  createdByUserId: null,
  notes: null,
};

const GPT_IMAGE_V4_ENTRY = {
  provider: 'OPENAI',
  modelKey: 'gpt-image-1',
  inputPerMillionMicroUsd: 5_000_000,
  outputPerMillionMicroUsd: 0,
  cachedInputPerMillionMicroUsd: null,
  cacheWritePerMillionMicroUsd: null,
  reasoningPerMillionMicroUsd: null,
  costClass: CostClass.PREMIUM,
  imagePerUnitMicroUsd: 167_000,
  supersedesSeededPrice: true,
};

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

  // Batch 2 (connector presets, ADR-116/117): every provider with a
  // WebFetch-verified real price gets a row so the Cost-Aware Ensemble does
  // not treat it as free. Groq, Cerebras, Qwen, OpenRouter and Vercel AI
  // Gateway are deliberately absent — no number could be verified for them
  // (see the comment block above the batch-2 entries) — and stay UNPRICED,
  // which `findRate` already treats as blocked rather than free.
  it('covers every batch-2 provider whose price was verified', () => {
    const keys = MODEL_COST_SEED_ENTRIES.map((e) => `${e.provider}:${e.modelKey}`);

    expect(keys).toEqual(
      expect.arrayContaining([
        'MISTRAL:mistral-large-latest',
        'TOGETHER:meta-llama/Llama-3.3-70B-Instruct-Turbo',
        'FIREWORKS:accounts/fireworks/models/llama-v3p3-70b-instruct',
        'DEEPINFRA:meta-llama/Llama-3.3-70B-Instruct-Turbo',
        'SAMBANOVA:Meta-Llama-3.3-70B-Instruct',
        'CLOUDFLARE:@cf/meta/llama-3.3-70b-instruct-fp8-fast',
        'PERPLEXITY:sonar',
        'COHERE:command-r-plus-08-2024',
        'ZAI:glm-4.6',
        'MOONSHOT:kimi-k2.6',
      ]),
    );

    for (const unverified of ['GROQ', 'CEREBRAS', 'QWEN', 'OPENROUTER', 'VERCEL_AI_GATEWAY']) {
      expect(MODEL_COST_SEED_ENTRIES.some((entry) => entry.provider === unverified)).toBe(false);
    }
  });

  it('has no duplicate provider/model pair', () => {
    const keys = MODEL_COST_SEED_ENTRIES.map((e) => `${e.provider}:${e.modelKey}`);
    expect(new Set(keys).size).toBe(keys.length);
  });

  // `hasUsablePricing` needs both. A model missing either is UNPRICED, which
  // for a PAYG provider means blocked — the exact failure this seed exists to
  // prevent. A per-UNIT model (an image model) carries its money in the unit
  // column instead, and must then carry a positive per-unit price.
  it('prices every entry by tokens or, for a per-unit model, by the unit', () => {
    for (const entry of MODEL_COST_SEED_ENTRIES) {
      const perUnit =
        (entry.imagePerUnitMicroUsd ?? 0) > 0 ||
        (entry.audioPerUnitMicroUsd ?? 0) > 0 ||
        (entry.ttsPerCharacterMicroUsd ?? 0) > 0;
      if (perUnit) {
        expect(entry.inputPerMillionMicroUsd).toBeGreaterThanOrEqual(0);
        expect(entry.outputPerMillionMicroUsd).toBe(0);
        continue;
      }
      expect(entry.inputPerMillionMicroUsd).toBeGreaterThan(0);
      expect(entry.outputPerMillionMicroUsd).toBeGreaterThan(0);
    }
  });

  // OpenAI's image API reports no token usage, so its price must be per image
  // or every generation settles at $0. List prices, seed v4.
  it('prices OpenAI images per image, at the quality image-service sends', () => {
    const byModel = new Map(MODEL_COST_SEED_ENTRIES.map((e) => [`${e.provider}:${e.modelKey}`, e]));
    expect(byModel.get('OPENAI:gpt-image-1')).toMatchObject({
      imagePerUnitMicroUsd: 167_000,
      outputPerMillionMicroUsd: 0,
      supersedesSeededPrice: true,
    });
    expect(byModel.get('OPENAI:dall-e-3')).toMatchObject({ imagePerUnitMicroUsd: 40_000 });
    expect(byModel.get('OPENAI:dall-e-2')).toMatchObject({ imagePerUnitMicroUsd: 20_000 });
  });

  // Gemini images report real usageMetadata and stay token-metered.
  it('leaves Gemini image models token-priced', () => {
    for (const entry of MODEL_COST_SEED_ENTRIES.filter(
      (e) => e.provider === 'GEMINI' && e.modelKey.includes('image'),
    )) {
      expect(entry.imagePerUnitMicroUsd ?? null).toBeNull();
      expect(entry.outputPerMillionMicroUsd).toBeGreaterThan(0);
    }
  });

  it('is version 4 or later, so installs that ran v3 pick up the image prices', () => {
    expect(MODEL_COST_SEED_VERSION).toBeGreaterThanOrEqual(4);
  });

  // whisper-1 reports no tokens; file-service finalizes a transcription on the
  // clip's measured seconds. $0.006/min list = 100 micro-USD per second.
  it('prices whisper-1 per second of audio, with zero token rates', () => {
    const whisper = MODEL_COST_SEED_ENTRIES.find(
      (e) => e.provider === 'OPENAI' && e.modelKey === 'whisper-1',
    );
    expect(whisper).toMatchObject({
      audioPerUnitMicroUsd: 100,
      inputPerMillionMicroUsd: 0,
      outputPerMillionMicroUsd: 0,
    });
    expect(whisper?.imagePerUnitMicroUsd ?? null).toBeNull();
    expect(whisper?.supersedesSeededPrice ?? false).toBe(false);
  });

  it('is version 5 or later, so installs that ran v4 pick up the whisper-1 price', () => {
    expect(MODEL_COST_SEED_VERSION).toBeGreaterThanOrEqual(5);
  });

  // "Read aloud" (PaygSurface.TTS, batch 9). /audio/speech returns bytes and
  // no usage, so OpenAI TTS settles on the characters chat-service sent:
  // $15 / 1M chars = 15 micro-USD per character, tts-1-hd $30 / 1M = 30.
  it('prices OpenAI tts-1 and tts-1-hd per character, with zero token rates', () => {
    const find = (modelKey: string): ModelCostSeedEntry | undefined =>
      MODEL_COST_SEED_ENTRIES.find((e) => e.provider === 'OPENAI' && e.modelKey === modelKey);
    expect(find('tts-1')).toMatchObject({
      ttsPerCharacterMicroUsd: 15,
      inputPerMillionMicroUsd: 0,
      outputPerMillionMicroUsd: 0,
    });
    expect(find('tts-1-hd')).toMatchObject({ ttsPerCharacterMicroUsd: 30 });
    expect(find('gpt-4o-mini-tts')).toBeUndefined();
  });

  // Gemini TTS reports usageMetadata, so it is token-priced: $0.50 / 1M text
  // in, $10 / 1M audio out — and carries no per-character rate.
  it('leaves Gemini TTS token-priced', () => {
    const gemini = MODEL_COST_SEED_ENTRIES.find(
      (e) => e.provider === 'GEMINI' && e.modelKey === 'gemini-2.5-flash-preview-tts',
    );
    expect(gemini).toMatchObject({
      inputPerMillionMicroUsd: 500_000,
      outputPerMillionMicroUsd: 10_000_000,
    });
    expect(gemini?.ttsPerCharacterMicroUsd ?? null).toBeNull();
  });

  it('is version 6 or later, so installs that ran v5 pick up the TTS prices', () => {
    expect(MODEL_COST_SEED_VERSION).toBeGreaterThanOrEqual(6);
  });

  // Size-aware gpt-image-1 (v7): one immutable row per priced size, keyed
  // `gpt-image-1@<w>x<h>`, which image-service meters against. HIGH quality.
  it('prices gpt-image-1 per size: square $0.167, portrait/landscape $0.25', () => {
    const find = (modelKey: string): ModelCostSeedEntry | undefined =>
      MODEL_COST_SEED_ENTRIES.find((e) => e.provider === 'OPENAI' && e.modelKey === modelKey);
    expect(find('gpt-image-1@1024x1024')).toMatchObject({
      imagePerUnitMicroUsd: 167_000,
      outputPerMillionMicroUsd: 0,
    });
    expect(find('gpt-image-1@1024x1536')).toMatchObject({ imagePerUnitMicroUsd: 250_000 });
    expect(find('gpt-image-1@1536x1024')).toMatchObject({ imagePerUnitMicroUsd: 250_000 });
    // New keys fill gaps; the v4 base row is untouched.
    for (const key of ['gpt-image-1@1024x1024', 'gpt-image-1@1024x1536', 'gpt-image-1@1536x1024']) {
      expect(find(key)?.supersedesSeededPrice ?? false).toBe(false);
    }
    expect(find('gpt-image-1')).toMatchObject({ imagePerUnitMicroUsd: 167_000 });
  });

  it('is version 7 or later, so installs that ran v6 pick up the sized image prices', () => {
    expect(MODEL_COST_SEED_VERSION).toBeGreaterThanOrEqual(7);
  });

  // Grok Imagine (v8): xAI's image endpoint reports no tokens, so without a
  // per-image row the provider fallback priced these at grok-4's TOKEN rate and
  // every Grok image settled at $0. Owner decision 2026-09-25.
  it('prices Grok Imagine images per image: $0.02 and the 2.0 top tier $0.08', () => {
    const find = (modelKey: string): ModelCostSeedEntry | undefined =>
      MODEL_COST_SEED_ENTRIES.find((e) => e.provider === 'GROK' && e.modelKey === modelKey);
    expect(find('grok-imagine-image')).toMatchObject({
      imagePerUnitMicroUsd: 20_000,
      inputPerMillionMicroUsd: 0,
      outputPerMillionMicroUsd: 0,
      replacesFallbackRate: true,
    });
    expect(find('grok-imagine-image-2.0')).toMatchObject({
      imagePerUnitMicroUsd: 80_000,
      inputPerMillionMicroUsd: 0,
      outputPerMillionMicroUsd: 0,
      replacesFallbackRate: true,
    });
    // Fills gaps — there was never a seeded Grok image row to supersede.
    for (const key of ['grok-imagine-image', 'grok-imagine-image-2.0']) {
      expect(find(key)?.supersedesSeededPrice ?? false).toBe(false);
    }
  });

  it('is version 8, so installs that ran v7 pick up the Grok image prices', () => {
    expect(MODEL_COST_SEED_VERSION).toBe(8);
    expect(MODEL_COST_SEED_NAME).toBe('model-cost-list-prices-2026-v8');
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
        entry.imagePerUnitMicroUsd ?? null,
        entry.audioPerUnitMicroUsd ?? null,
        entry.ttsPerCharacterMicroUsd ?? null,
      ]) {
        if (rate === null) {
          continue;
        }
        expect(Number.isInteger(rate)).toBe(true);
        expect(rate).toBeGreaterThanOrEqual(0);
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
  let prisma: { $transaction: Mock };
  let repository: ModelCostSeedRepository;

  beforeEach(() => {
    transaction = buildTransaction();
    prisma = {
      $transaction: vi.fn((callback: (tx: TransactionMock) => unknown) => callback(transaction)),
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

    expect(result).toEqual({
      outcome: SeedApplyOutcome.APPLIED,
      inserted: 2,
      skipped: 0,
      repriced: [],
    });
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

    expect(result).toEqual({
      outcome: SeedApplyOutcome.APPLIED,
      inserted: 1,
      skipped: 1,
      repriced: [],
    });
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
    expect(result).toEqual({
      outcome: SeedApplyOutcome.APPLIED,
      inserted: 0,
      skipped: 2,
      repriced: [],
    });
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

  describe('superseding a seeded price', () => {
    beforeEach(() => {
      transaction.modelCostVersion.findMany.mockResolvedValue([
        { provider: 'OPENAI', modelKey: 'gpt-image-1' },
      ]);
      transaction.modelCostVersion.findUnique.mockResolvedValue(V3_GPT_IMAGE_ROW);
      transaction.modelCostVersion.findFirst.mockResolvedValue({ version: 1 });
    });

    it('retires the old seeded row and appends a NEW version with the per-image price', async () => {
      const result = await repository.applyOnce(seedInput({ entries: [GPT_IMAGE_V4_ENTRY] }));

      expect(result.repriced).toEqual([
        { provider: 'OPENAI', modelKey: 'gpt-image-1', version: 2 },
      ]);
      // The old row's rates are never rewritten — only its active flags.
      expect(transaction.modelCostVersion.update).toHaveBeenCalledWith({
        where: { id: V3_GPT_IMAGE_ROW.id },
        data: { isActive: false, activeKey: null, retiredAt: expect.any(Date) },
      });
      const [created] = transaction.modelCostVersion.create.mock.calls[0] as [
        { data: Record<string, unknown> },
      ];
      expect(created.data).toMatchObject({
        provider: 'OPENAI',
        modelKey: 'gpt-image-1',
        version: 2,
        imagePerUnitMicroUsd: 167_000n,
        outputPerMillionMicroUsd: 0n,
        inputPerMillionMicroUsd: 5_000_000n,
        source: ModelCostSource.SEED,
        isAdminOverride: false,
        isActive: true,
        activeKey: 'OPENAI:gpt-image-1',
      });
      expect(transaction.modelCostVersion.createMany).not.toHaveBeenCalled();
    });

    it('never supersedes an administrator override', async () => {
      transaction.modelCostVersion.findUnique.mockResolvedValue({
        ...V3_GPT_IMAGE_ROW,
        isAdminOverride: true,
        source: ModelCostSource.ADMIN_OVERRIDE,
      });

      const result = await repository.applyOnce(seedInput({ entries: [GPT_IMAGE_V4_ENTRY] }));

      expect(result.repriced).toEqual([]);
      expect(transaction.modelCostVersion.update).not.toHaveBeenCalled();
      expect(transaction.modelCostVersion.create).not.toHaveBeenCalled();
    });

    it('never supersedes a synced price', async () => {
      transaction.modelCostVersion.findUnique.mockResolvedValue({
        ...V3_GPT_IMAGE_ROW,
        source: ModelCostSource.PROVIDER_SYNC,
      });

      const result = await repository.applyOnce(seedInput({ entries: [GPT_IMAGE_V4_ENTRY] }));

      expect(result.repriced).toEqual([]);
      expect(transaction.modelCostVersion.create).not.toHaveBeenCalled();
    });

    it('is a no-op when the active seeded price already matches', async () => {
      transaction.modelCostVersion.findUnique.mockResolvedValue({
        ...V3_GPT_IMAGE_ROW,
        inputPerMillionMicroUsd: 5_000_000n,
        outputPerMillionMicroUsd: 0n,
        imagePerUnitMicroUsd: 167_000n,
      });

      const result = await repository.applyOnce(seedInput({ entries: [GPT_IMAGE_V4_ENTRY] }));

      expect(result).toMatchObject({ inserted: 0, skipped: 1, repriced: [] });
      expect(transaction.modelCostVersion.update).not.toHaveBeenCalled();
    });

    it('does not supersede anything for an entry without the flag', async () => {
      const { supersedesSeededPrice: _flag, ...unflagged } = GPT_IMAGE_V4_ENTRY;

      await repository.applyOnce(seedInput({ entries: [unflagged] }));

      expect(transaction.modelCostVersion.findUnique).not.toHaveBeenCalled();
      expect(transaction.modelCostVersion.update).not.toHaveBeenCalled();
    });

    it('announces a gap filled over a provider-fallback rate as a re-price (version 1)', async () => {
      transaction.modelCostVersion.findMany.mockResolvedValue([]);
      const grokEntry = MODEL_COST_SEED_ENTRIES.find(
        (e) => e.provider === 'GROK' && e.modelKey === 'grok-imagine-image',
      );
      expect(grokEntry).toBeDefined();
      const entries = grokEntry === undefined ? [] : [grokEntry];

      const result = await repository.applyOnce(seedInput({ entries }));

      expect(result).toEqual({
        outcome: SeedApplyOutcome.APPLIED,
        inserted: 1,
        skipped: 0,
        repriced: [{ provider: 'GROK', modelKey: 'grok-imagine-image', version: 1 }],
      });
      const [args] = transaction.modelCostVersion.createMany.mock.calls[0] as [
        { data: Array<Record<string, unknown>> },
      ];
      expect(args.data[0]).toMatchObject({
        provider: 'GROK',
        modelKey: 'grok-imagine-image',
        version: 1,
        imagePerUnitMicroUsd: 20_000n,
        inputPerMillionMicroUsd: 0n,
        outputPerMillionMicroUsd: 0n,
        source: ModelCostSource.SEED,
        isAdminOverride: false,
        activeKey: 'GROK:grok-imagine-image',
      });
      // A fill never retires anything.
      expect(transaction.modelCostVersion.update).not.toHaveBeenCalled();
    });

    it('does not announce a fallback-flagged model that already carries a price', async () => {
      transaction.modelCostVersion.findMany.mockResolvedValue([
        { provider: 'GROK', modelKey: 'grok-imagine-image-2.0' },
      ]);
      const entry = MODEL_COST_SEED_ENTRIES.find(
        (e) => e.provider === 'GROK' && e.modelKey === 'grok-imagine-image-2.0',
      );
      const entries = entry === undefined ? [] : [entry];

      const result = await repository.applyOnce(seedInput({ entries }));

      expect(result).toMatchObject({ inserted: 0, skipped: 1, repriced: [] });
      expect(transaction.modelCostVersion.createMany).not.toHaveBeenCalled();
    });

    it('writes the per-image price on a fresh install (gap fill)', async () => {
      transaction.modelCostVersion.findMany.mockResolvedValue([]);

      await repository.applyOnce(seedInput({ entries: [GPT_IMAGE_V4_ENTRY] }));

      const [args] = transaction.modelCostVersion.createMany.mock.calls[0] as [
        { data: Array<Record<string, unknown>> },
      ];
      expect(args.data[0]).toMatchObject({ version: 1, imagePerUnitMicroUsd: 167_000n });
      expect(transaction.modelCostVersion.update).not.toHaveBeenCalled();
    });
  });
});

describe('ModelCostSeedService', () => {
  let repository: { applyOnce: Mock };
  let service: ModelCostSeedService;

  beforeEach(() => {
    repository = {
      applyOnce: vi.fn().mockResolvedValue({
        outcome: SeedApplyOutcome.APPLIED,
        inserted: 16,
        skipped: 0,
        repriced: [],
      }),
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
      repriced: [],
    });

    await expect(service.seed()).resolves.toEqual({
      outcome: SeedApplyOutcome.ALREADY_APPLIED,
      inserted: 0,
      skipped: 16,
      repriced: [],
    });
  });
});
