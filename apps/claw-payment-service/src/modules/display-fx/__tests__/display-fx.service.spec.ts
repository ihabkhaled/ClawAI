import { vi, type Mock } from 'vitest';
import { DisplayFxSource } from '@claw/shared-types';

import { type RedisService } from '../../../infrastructure/redis/redis.service';
import { type FawazExchangeProvider } from '../providers/fawaz-exchange.provider';
import { type FrankfurterProvider } from '../providers/frankfurter.provider';
import { DisplayFxService } from '../services/display-fx.service';

const RATE_SCALE = 10_000_000;

function buildRedis(overrides: Partial<Record<string, unknown>> = {}): RedisService {
  return {
    get: vi.fn().mockResolvedValue(null),
    set: vi.fn().mockResolvedValue(undefined),
    acquireLock: vi.fn().mockResolvedValue(true),
    releaseLock: vi.fn().mockResolvedValue(true),
    ...overrides,
  } as unknown as RedisService;
}

const frankfurterRate = {
  rateScaled: 51 * RATE_SCALE,
  asOf: '2026-09-11',
  source: DisplayFxSource.FRANKFURTER,
};
const fallbackRate = {
  rateScaled: 52 * RATE_SCALE,
  asOf: '2026-09-10',
  source: DisplayFxSource.FAWAZ_EXCHANGE_API,
};

describe('DisplayFxService', () => {
  it('returns null for USD because there is nothing to convert', async () => {
    const primary = { fetchRate: vi.fn() } as unknown as FrankfurterProvider;
    const fallback = { fetchRate: vi.fn() } as unknown as FawazExchangeProvider;
    const service = new DisplayFxService(buildRedis(), primary, fallback);

    expect(await service.getRate('USD')).toBeNull();
    expect(primary.fetchRate).not.toHaveBeenCalled();
  });

  it('refuses an unknown code before it reaches a cache key or a provider', async () => {
    // An unvalidated currency in a Redis namespace is a way to mint unlimited
    // keys from a query string.
    const redis = buildRedis();
    const primary = { fetchRate: vi.fn() } as unknown as FrankfurterProvider;
    const fallback = { fetchRate: vi.fn() } as unknown as FawazExchangeProvider;
    const service = new DisplayFxService(redis, primary, fallback);

    for (const code of ['BTC', 'ZZZ', '../../etc', 'A'.repeat(500), '']) {
      expect(await service.getRate(code)).toBeNull();
    }
    expect(redis.get).not.toHaveBeenCalled();
    expect(primary.fetchRate).not.toHaveBeenCalled();
  });

  it('uses the primary and does not call the fallback', async () => {
    const primary = {
      fetchRate: vi.fn().mockResolvedValue(frankfurterRate),
    } as unknown as FrankfurterProvider;
    const fallback = { fetchRate: vi.fn() } as unknown as FawazExchangeProvider;
    const service = new DisplayFxService(buildRedis(), primary, fallback);

    const rate = await service.getRate('EGP');
    expect(rate?.rateScaled).toBe(51 * RATE_SCALE);
    expect(rate?.source).toBe(DisplayFxSource.FRANKFURTER);
    expect(fallback.fetchRate).not.toHaveBeenCalled();
  });

  it('falls through to the fallback when the primary cannot answer', async () => {
    const primary = {
      fetchRate: vi.fn().mockResolvedValue(null),
    } as unknown as FrankfurterProvider;
    const fallback = {
      fetchRate: vi.fn().mockResolvedValue(fallbackRate),
    } as unknown as FawazExchangeProvider;
    const service = new DisplayFxService(buildRedis(), primary, fallback);

    const rate = await service.getRate('NGN');
    expect(rate?.source).toBe(DisplayFxSource.FAWAZ_EXCHANGE_API);
  });

  it('returns null when both providers fail, so the caller renders USD', async () => {
    const primary = {
      fetchRate: vi.fn().mockResolvedValue(null),
    } as unknown as FrankfurterProvider;
    const fallback = {
      fetchRate: vi.fn().mockResolvedValue(null),
    } as unknown as FawazExchangeProvider;
    const redis = buildRedis();
    const service = new DisplayFxService(redis, primary, fallback);

    expect(await service.getRate('EGP')).toBeNull();
    // Remembered briefly so the next render does not re-ask the same
    // unanswerable question.
    expect(redis.set).toHaveBeenCalledWith(
      expect.stringContaining('display-fx:unsupported:EGP'),
      '1',
      expect.any(Number),
    );
  });
});

describe('DisplayFxService caching', () => {
  it('serves a cache hit without touching a provider', async () => {
    const cached = JSON.stringify({
      baseCurrency: 'USD',
      quoteCurrency: 'EGP',
      rateScaled: 51 * RATE_SCALE,
      asOf: '2026-09-11',
      source: DisplayFxSource.FRANKFURTER,
    });
    const primary = { fetchRate: vi.fn() } as unknown as FrankfurterProvider;
    const fallback = { fetchRate: vi.fn() } as unknown as FawazExchangeProvider;
    const redis = buildRedis({ get: vi.fn().mockResolvedValue(cached) });
    const service = new DisplayFxService(redis, primary, fallback);

    const rate = await service.getRate('EGP');
    expect(rate?.source).toBe(DisplayFxSource.CACHE);
    expect(primary.fetchRate).not.toHaveBeenCalled();
  });

  it('re-validates a cache entry rather than trusting it', async () => {
    // A cache is storage, not a source of truth. A poisoned or half-written
    // entry must not become a price.
    const primary = {
      fetchRate: vi.fn().mockResolvedValue(frankfurterRate),
    } as unknown as FrankfurterProvider;
    const fallback = { fetchRate: vi.fn() } as unknown as FawazExchangeProvider;
    const poisoned = JSON.stringify({
      baseCurrency: 'USD',
      quoteCurrency: 'EGP',
      rateScaled: -1,
      asOf: null,
      source: DisplayFxSource.FRANKFURTER,
    });
    const service = new DisplayFxService(
      buildRedis({
        get: vi
          .fn()
          .mockImplementation((key: string) =>
            Promise.resolve(key.includes('display-fx:rate') ? poisoned : null),
          ),
      }),
      primary,
      fallback,
    );

    const rate = await service.getRate('EGP');
    expect(rate?.rateScaled).toBe(51 * RATE_SCALE);
    expect(primary.fetchRate).toHaveBeenCalled();
  });

  it('skips both providers for a currency known to be unquotable', async () => {
    const primary = { fetchRate: vi.fn() } as unknown as FrankfurterProvider;
    const fallback = { fetchRate: vi.fn() } as unknown as FawazExchangeProvider;
    const redis = buildRedis({
      get: vi
        .fn()
        .mockImplementation((key: string) =>
          Promise.resolve(key.includes('unsupported') ? '1' : null),
        ),
    });
    const service = new DisplayFxService(redis, primary, fallback);

    expect(await service.getRate('EGP')).toBeNull();
    expect(primary.fetchRate).not.toHaveBeenCalled();
  });

  it('still renders a price when Redis is down', async () => {
    // Losing the cache degrades performance. It must not degrade the page.
    const primary = {
      fetchRate: vi.fn().mockResolvedValue(frankfurterRate),
    } as unknown as FrankfurterProvider;
    const fallback = { fetchRate: vi.fn() } as unknown as FawazExchangeProvider;
    const redis = buildRedis({
      get: vi.fn().mockRejectedValue(new Error('ECONNREFUSED')),
      set: vi.fn().mockRejectedValue(new Error('ECONNREFUSED')),
      acquireLock: vi.fn().mockRejectedValue(new Error('ECONNREFUSED')),
      releaseLock: vi.fn().mockRejectedValue(new Error('ECONNREFUSED')),
    });
    const service = new DisplayFxService(redis, primary, fallback);

    const rate = await service.getRate('EGP');
    expect(rate?.rateScaled).toBe(51 * RATE_SCALE);
  });
});

describe('DisplayFxService single-flight', () => {
  it('collapses a cold-cache stampede into one upstream call', async () => {
    // A thousand simultaneous visitors on an empty cache must not become a
    // thousand requests to a free API. That is how a free API stops being
    // available.
    let stored: string | null = null;
    let lockHeld = false;
    const primary = {
      fetchRate: vi.fn().mockResolvedValue(frankfurterRate),
    } as unknown as FrankfurterProvider;
    const fallback = { fetchRate: vi.fn() } as unknown as FawazExchangeProvider;
    const redis = buildRedis({
      get: vi.fn().mockImplementation(() => Promise.resolve(stored)),
      set: vi.fn().mockImplementation((key: string, value: string) => {
        if (key.includes('display-fx:rate')) {
          stored = value;
        }
        return Promise.resolve(undefined);
      }),
      acquireLock: vi.fn().mockImplementation(() => {
        if (lockHeld) {
          return Promise.resolve(false);
        }
        lockHeld = true;
        return Promise.resolve(true);
      }),
      releaseLock: vi.fn().mockImplementation(() => {
        lockHeld = false;
        return Promise.resolve(true);
      }),
    });
    const service = new DisplayFxService(redis, primary, fallback);

    const results = await Promise.all(
      Array.from({ length: 25 }, async () => service.getRate('EGP')),
    );
    expect(results.every((rate) => rate?.rateScaled === 51 * RATE_SCALE)).toBe(true);
    expect((primary.fetchRate as Mock).mock.calls).toHaveLength(1);
  });
});
