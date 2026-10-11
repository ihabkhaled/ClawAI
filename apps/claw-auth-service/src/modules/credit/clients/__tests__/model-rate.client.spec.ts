import { Test } from '@nestjs/testing';
import { vi } from 'vitest';
import { httpRequest } from '@claw/shared-utilities';

import { RedisService } from '../../../../infrastructure/redis/redis.service';
import { ModelRateClient } from '../model-rate.client';

vi.mock('@claw/shared-utilities', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  httpRequest: vi.fn(),
}));

vi.mock('../../../../app/config/app.config', () => ({
  AppConfig: { get: () => ({ ROUTING_SERVICE_URL: 'https://routing.test' }) },
}));

vi.mock('../../../../common/utilities', () => ({
  buildInterServiceAuthHeader: () => 'Service tok',
}));

// routing-service's answer for one model, as the wire carries it.
function costPayload(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    provider: 'OPENAI',
    model: 'gpt-image-1',
    version: 4,
    currency: 'USD',
    inputPerMillionMicroUsd: 0,
    outputPerMillionMicroUsd: 0,
    cachedInputPerMillionMicroUsd: null,
    cacheWritePerMillionMicroUsd: null,
    reasoningPerMillionMicroUsd: null,
    imagePerUnitMicroUsd: null,
    audioPerUnitMicroUsd: null,
    videoPerUnitMicroUsd: null,
    toolCallPerUnitMicroUsd: null,
    searchCallPerUnitMicroUsd: null,
    ttsPerCharacterMicroUsd: null,
    costClass: 'PREMIUM',
    isAdminOverride: false,
    effectiveFrom: '2026-09-25T00:00:00.000Z',
    lastVerifiedAt: null,
    source: 'SEED',
    isPriced: true,
    localComputeOwnership: null,
    ...overrides,
  };
}

describe('ModelRateClient — per-unit rows', () => {
  let client: ModelRateClient;

  beforeEach(async () => {
    vi.mocked(httpRequest).mockReset();
    const module = await Test.createTestingModule({
      providers: [
        ModelRateClient,
        {
          provide: RedisService,
          useValue: {
            get: vi.fn().mockResolvedValue(null),
            set: vi.fn().mockResolvedValue(undefined),
            del: vi.fn().mockResolvedValue(undefined),
          },
        },
      ],
    }).compile();
    client = module.get(ModelRateClient);
  });

  function answer(payload: Record<string, unknown>): void {
    vi.mocked(httpRequest).mockResolvedValue({ ok: true, status: 200, data: payload });
  }

  it('does NOT mistake a per-image row with zero token rates for the local zero-rate fallback', async () => {
    answer(costPayload({ imagePerUnitMicroUsd: 167_000 }));

    const snapshot = await client.findRate('OPENAI', 'gpt-image-1');

    expect(snapshot?.isLocalComputeFallback).toBe(false);
    expect(snapshot?.rates.imagePerUnitMicroUsd).toBe(167_000);
  });

  it('does NOT mistake a per-second VIDEO row with zero token rates for the local fallback', async () => {
    // Found live 2026-10-01: a funded Pro user was refused PAYG_MODEL_UNPRICED on Veo.
    answer(costPayload({ videoPerUnitMicroUsd: 50_000 }));

    const snapshot = await client.findRate('GEMINI', 'veo-3.1-lite-generate-preview');

    expect(snapshot?.isLocalComputeFallback).toBe(false);
    expect(snapshot?.rates.videoPerUnitMicroUsd).toBe(50_000);
  });

  it('treats per-second and per-character rows the same way', async () => {
    answer(costPayload({ audioPerUnitMicroUsd: 100 }));
    expect((await client.findRate('OPENAI', 'whisper-1'))?.isLocalComputeFallback).toBe(false);

    answer(costPayload({ ttsPerCharacterMicroUsd: 15 }));
    const tts = await client.findRate('OPENAI', 'tts-1');
    expect(tts?.isLocalComputeFallback).toBe(false);
    expect(tts?.rates.ttsPerCharacterMicroUsd).toBe(15);
  });

  it('still flags a priced row with EVERY rate at zero as the local fallback', async () => {
    answer(costPayload());

    expect((await client.findRate('OPENAI', 'gpt-5'))?.isLocalComputeFallback).toBe(true);
  });

  it('parses a routing-service answer that predates ttsPerCharacterMicroUsd', async () => {
    const legacy = costPayload({
      model: 'gpt-5',
      inputPerMillionMicroUsd: 1_250_000,
      outputPerMillionMicroUsd: 10_000_000,
    });
    delete legacy['ttsPerCharacterMicroUsd'];
    answer(legacy);

    const snapshot = await client.findRate('OPENAI', 'gpt-5');

    expect(snapshot?.rates.ttsPerCharacterMicroUsd).toBeNull();
    expect(snapshot?.isLocalComputeFallback).toBe(false);
  });
});

describe('ModelRateClient — alias-aware cache', () => {
  const redis = {
    get: vi.fn(),
    set: vi.fn(),
    del: vi.fn(),
    deleteByPrefixChecked: vi.fn(),
  };
  let client: ModelRateClient;

  beforeEach(async () => {
    vi.mocked(httpRequest).mockReset();
    redis.get.mockReset().mockResolvedValue(null);
    redis.set.mockReset().mockResolvedValue(undefined);
    redis.del.mockReset().mockResolvedValue(undefined);
    redis.deleteByPrefixChecked.mockReset().mockResolvedValue({ removed: 1, complete: true });
    const module = await Test.createTestingModule({
      providers: [ModelRateClient, { provide: RedisService, useValue: redis }],
    }).compile();
    client = module.get(ModelRateClient);
    vi.mocked(httpRequest).mockResolvedValue({
      ok: true,
      status: 200,
      data: costPayload({ model: 'gemini-2.5-flash', inputPerMillionMicroUsd: 300_000 }),
    });
  });

  it('fetches and caches decorated ids under the canonical model id', async () => {
    await client.findRate('GEMINI', 'models/gemini-2.5-flash:batch');

    expect(vi.mocked(httpRequest).mock.calls[0]?.[0].url).toMatch(/\/GEMINI\/gemini-2\.5-flash$/);
    expect(redis.set.mock.calls[0]?.[0]).toBe('claw:payg:rate:GEMINI:gemini-2.5-flash');
  });

  it('strips a ~ pointer variant but keeps a dated suffix', async () => {
    await client.findRate('OPENAI', 'gpt-4o~latest');
    await client.findRate('OPENAI', 'gpt-4o-2024-08-06');

    expect(redis.set.mock.calls[0]?.[0]).toBe('claw:payg:rate:OPENAI:gpt-4o');
    expect(redis.set.mock.calls[1]?.[0]).toBe('claw:payg:rate:OPENAI:gpt-4o-2024-08-06');
  });

  it('invalidates the whole family: dated and variant keys share the published prefix', async () => {
    await client.invalidate('OPENAI', 'models/gpt-4o-2024-08-06');

    expect(redis.deleteByPrefixChecked).toHaveBeenCalledWith(
      'claw:payg:rate:OPENAI:gpt-4o',
      expect.any(Number),
      expect.any(Number),
    );
  });

  it('happy path: complete scan deletes nothing extra and does not throw', async () => {
    await expect(client.invalidate('GEMINI', 'gemini-2.5-flash')).resolves.toBeUndefined();
    expect(redis.del).not.toHaveBeenCalled();
  });

  it('on a scan error still deletes canonical, family and raw keys, then throws', async () => {
    redis.deleteByPrefixChecked.mockRejectedValue(new Error('scan down'));

    await expect(client.invalidate('OPENAI', 'models/gpt-4o-2024-08-06:batch')).rejects.toThrow(
      /incomplete/,
    );

    const deleted = redis.del.mock.calls.map((call) => call[0]);
    expect(deleted).toEqual(
      expect.arrayContaining([
        'claw:payg:rate:OPENAI:gpt-4o-2024-08-06',
        'claw:payg:rate:OPENAI:gpt-4o',
        'claw:payg:rate:OPENAI:models/gpt-4o-2024-08-06:batch',
      ]),
    );
  });

  it('treats a scan cut short by its bound as a failure: alias keys removed, error thrown', async () => {
    redis.deleteByPrefixChecked.mockResolvedValue({ removed: 5, complete: false });

    await expect(client.invalidate('GEMINI', 'models/gemini-2.5-flash')).rejects.toThrow();

    expect(redis.del).toHaveBeenCalledWith('claw:payg:rate:GEMINI:gemini-2.5-flash');
  });
});
