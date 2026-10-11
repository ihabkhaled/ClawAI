import { type PricedModelRow, type SnapshotPriceFields } from '../types/connectors.types';
import { usdPerMillionToMicroUsd } from './usd-per-token-price.utility';

/** Snapshot price fields for one stored model row; unpublished prices are left out. */
export function publishedSnapshotPrices(row: PricedModelRow): SnapshotPriceFields {
  const input = usdPerMillionToMicroUsd(row.inputUsdPerMillion);
  const output = usdPerMillionToMicroUsd(row.outputUsdPerMillion);
  const cached = usdPerMillionToMicroUsd(row.cachedInputUsdPerMillion);
  return {
    ...(input === undefined ? {} : { inputCostPerMTokMicroUsd: input }),
    ...(output === undefined ? {} : { outputCostPerMTokMicroUsd: output }),
    ...(cached === undefined ? {} : { cachedInputCostPerMTokMicroUsd: cached }),
  };
}
