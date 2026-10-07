import type { PriceBook } from '../types/model-output-price.types';

/** How long the model output prices are reused before the price table is read again. */
export const MODEL_OUTPUT_PRICE_CACHE_TTL_MS = 60_000;

/** The price book when the price table has not been read (or cannot be). */
export const EMPTY_PRICE_BOOK: PriceBook = {
  byModel: new Map<string, number>(),
  dearestByProvider: new Map<string, number>(),
};
