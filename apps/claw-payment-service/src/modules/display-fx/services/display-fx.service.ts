import { Injectable, Logger } from '@nestjs/common';
import {
  DISPLAY_BASE_CURRENCY,
  DISPLAY_FX_CACHE_TTL_MS,
  DISPLAY_FX_NEGATIVE_CACHE_TTL_MS,
} from '@claw/shared-constants';
import { type DisplayFxRate, DisplayFxSource } from '@claw/shared-types';
import { isSaneDisplayRate, normalizeDisplayCurrency } from '@claw/shared-utilities';

import { RedisService } from '../../../infrastructure/redis/redis.service';
import {
  DISPLAY_FX_CACHE_PREFIX,
  DISPLAY_FX_LOCK_POLL_MS,
  DISPLAY_FX_LOCK_PREFIX,
  DISPLAY_FX_LOCK_TTL_S,
  DISPLAY_FX_LOCK_WAIT_MS,
  DISPLAY_FX_NEGATIVE_CACHE_PREFIX,
} from '../constants/display-fx.constants';
import { FawazExchangeProvider } from '../providers/fawaz-exchange.provider';
import { FrankfurterProvider } from '../providers/frankfurter.provider';
import { type DisplayFxProvider } from '../types/display-fx.types';

// DISPLAY rates. Read the module's sibling, `modules/fx`, before changing
// anything here: that one charges cards and this one does not, and the two sets
// of rules are opposites.
//
// This service FAILS OPEN. Every failure path returns null, the caller renders
// canonical USD, and nothing downstream is blocked. A pricing page that shows
// dollars is working; a pricing page that shows nothing is an outage.
@Injectable()
export class DisplayFxService {
  private readonly logger = new Logger(DisplayFxService.name);

  private readonly providers: readonly DisplayFxProvider[];

  constructor(
    private readonly redis: RedisService,
    primary: FrankfurterProvider,
    fallback: FawazExchangeProvider,
  ) {
    // Order is the failover policy, in one place. A caller never chooses a
    // provider, so "which upstream answered" can never become business logic.
    this.providers = [primary, fallback];
  }

  // Returns null whenever the canonical currency should be shown instead.
  async getRate(quoteCurrencyInput: string): Promise<DisplayFxRate | null> {
    const quoteCurrency = normalizeDisplayCurrency(quoteCurrencyInput);
    if (quoteCurrency === null) {
      // An unknown code is a visitor with a stale cookie, not an attack worth
      // an error response. It is also never allowed to reach a cache key.
      return null;
    }
    if (quoteCurrency === DISPLAY_BASE_CURRENCY) {
      return null;
    }

    const cached = await this.readCache(quoteCurrency);
    if (cached !== null) {
      return cached;
    }
    if (await this.isKnownUnsupported(quoteCurrency)) {
      return null;
    }
    return this.fetchWithSingleFlight(quoteCurrency);
  }

  // One cold-cache visitor calls upstream; the rest wait briefly and read the
  // result. Without this, a thousand simultaneous Egyptian visitors on an empty
  // cache are a thousand requests to a free API, which is how a free API stops
  // being available.
  private async fetchWithSingleFlight(quoteCurrency: string): Promise<DisplayFxRate | null> {
    const lockKey = `${DISPLAY_FX_LOCK_PREFIX}:${quoteCurrency}`;
    const owner = `${String(process.pid)}-${String(Date.now())}`;
    const acquired = await this.redis
      .acquireLock(lockKey, owner, DISPLAY_FX_LOCK_TTL_S)
      .catch(() => false);

    if (!acquired) {
      const waited = await this.awaitLeaderResult(quoteCurrency);
      if (waited !== null) {
        return waited;
      }
      // The leader is slow or died. Fetching anyway beats showing the wrong
      // currency, and the lock TTL bounds how often this can happen.
      return this.fetchFromProviders(quoteCurrency);
    }

    try {
      return await this.fetchFromProviders(quoteCurrency);
    } finally {
      await this.redis.releaseLock(lockKey, owner).catch(() => false);
    }
  }

  private async awaitLeaderResult(quoteCurrency: string): Promise<DisplayFxRate | null> {
    const deadline = Date.now() + DISPLAY_FX_LOCK_WAIT_MS;
    while (Date.now() < deadline) {
      await new Promise((resolve) => setTimeout(resolve, DISPLAY_FX_LOCK_POLL_MS));
      const cached = await this.readCache(quoteCurrency);
      if (cached !== null) {
        return cached;
      }
    }
    return null;
  }

  private async fetchFromProviders(quoteCurrency: string): Promise<DisplayFxRate | null> {
    for (const provider of this.providers) {
      const result = await provider.fetchRate(DISPLAY_BASE_CURRENCY, quoteCurrency);
      if (result === null) {
        continue;
      }
      const rate: DisplayFxRate = {
        baseCurrency: DISPLAY_BASE_CURRENCY,
        quoteCurrency,
        rateScaled: result.rateScaled,
        asOf: result.asOf,
        source: result.source,
      };
      await this.writeCache(rate);
      return rate;
    }

    // Nobody could quote it. Remembered briefly so the next render of the same
    // page does not ask both providers the same unanswerable question again.
    this.logger.warn(`fetchFromProviders: no provider could quote USD->${quoteCurrency}`);
    await this.redis
      .set(
        `${DISPLAY_FX_NEGATIVE_CACHE_PREFIX}:${quoteCurrency}`,
        '1',
        Math.floor(DISPLAY_FX_NEGATIVE_CACHE_TTL_MS / 1_000),
      )
      .catch(() => {});
    return null;
  }

  private async readCache(quoteCurrency: string): Promise<DisplayFxRate | null> {
    try {
      const raw = await this.redis.get(`${DISPLAY_FX_CACHE_PREFIX}:${quoteCurrency}`);
      if (raw === null) {
        return null;
      }
      const parsed = JSON.parse(raw) as DisplayFxRate;
      // Re-validated on the way out. A cache is storage, not a source of truth,
      // and a poisoned or half-written entry must not become a price.
      if (parsed.quoteCurrency !== quoteCurrency || !isSaneDisplayRate(parsed.rateScaled)) {
        return null;
      }
      return { ...parsed, source: DisplayFxSource.CACHE };
    } catch {
      // Redis being down degrades the cache, never the page.
      return null;
    }
  }

  private async writeCache(rate: DisplayFxRate): Promise<void> {
    await this.redis
      .set(
        `${DISPLAY_FX_CACHE_PREFIX}:${rate.quoteCurrency}`,
        JSON.stringify(rate),
        Math.floor(DISPLAY_FX_CACHE_TTL_MS / 1_000),
      )
      .catch(() => {});
  }

  private async isKnownUnsupported(quoteCurrency: string): Promise<boolean> {
    const raw = await this.redis
      .get(`${DISPLAY_FX_NEGATIVE_CACHE_PREFIX}:${quoteCurrency}`)
      .catch(() => null);
    return raw !== null;
  }
}
