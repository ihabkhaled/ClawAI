import { Injectable, Logger } from '@nestjs/common';
import { modelMatchKey } from '@claw/shared-utilities';

import { ModelCostService } from '../../router-models/services/model-cost.service';
import {
  EMPTY_PRICE_BOOK,
  MODEL_OUTPUT_PRICE_CACHE_TTL_MS,
} from '../constants/model-output-price.constants';
import {
  hasOnlyTokenPrices,
  isOutputPriceAboveCap,
} from '../utilities/free-model-price-guard.utility';
import type { PriceBook } from '../types/model-output-price.types';

/**
 * What each model costs per million OUTPUT tokens, for the free plan's price limit (ADR-162).
 *
 * One read of the active price rows, kept for a short while: a routing decision must not wait on
 * the price table, and a price change reaching AUTO a minute late is harmless because auth-service
 * checks the real price again when the request is reserved.
 */
@Injectable()
export class ModelOutputPriceService {
  private readonly logger = new Logger(ModelOutputPriceService.name);
  private cache: { prices: PriceBook; expiresAt: number } | null = null;

  constructor(private readonly modelCosts: ModelCostService) {}

  /**
   * A checker for one request. With no limit it is always false. A model with no known price is
   * NOT treated as dear: it cannot be judged here, and the metering backstop refuses an unpriced
   * credit model on its own.
   */
  async buildChecker(
    capMicroUsd: number | null | undefined,
    now: number = Date.now(),
  ): Promise<(provider: string, model: string) => boolean> {
    if (typeof capMicroUsd !== 'number') {
      return () => false;
    }
    const book = await this.loadPrices(now);
    return (provider, model) =>
      isOutputPriceAboveCap(
        // A model with no price of its own is judged by the dearest chat model its provider sells,
        // the same pessimistic stand-in auth-service charges it, so the two agree on what is dear.
        book.byModel.get(modelMatchKey(provider, model)) ??
          book.dearestByProvider.get(provider.toUpperCase()),
        capMicroUsd,
      );
  }

  private async loadPrices(now: number): Promise<PriceBook> {
    if (this.cache !== null && this.cache.expiresAt > now) {
      return this.cache.prices;
    }
    try {
      const snapshots = await this.modelCosts.listActive();
      const byModel = new Map<string, number>();
      const dearestByProvider = new Map<string, number>();
      for (const snapshot of snapshots) {
        if (snapshot.outputPerMillionMicroUsd === null) {
          continue;
        }
        byModel.set(
          modelMatchKey(snapshot.provider, snapshot.model),
          snapshot.outputPerMillionMicroUsd,
        );
        if (hasOnlyTokenPrices(snapshot)) {
          const key = snapshot.provider.toUpperCase();
          const current = dearestByProvider.get(key) ?? 0;
          dearestByProvider.set(key, Math.max(current, snapshot.outputPerMillionMicroUsd));
        }
      }
      const prices: PriceBook = { byModel, dearestByProvider };
      this.cache = { prices, expiresAt: now + MODEL_OUTPUT_PRICE_CACHE_TTL_MS };
      return prices;
    } catch (error) {
      this.logger.warn(
        `loadPrices: price table unreadable, no price limit this time (${String(error)})`,
      );
      return this.cache?.prices ?? EMPTY_PRICE_BOOK;
    }
  }
}
