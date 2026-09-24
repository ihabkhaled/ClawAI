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
