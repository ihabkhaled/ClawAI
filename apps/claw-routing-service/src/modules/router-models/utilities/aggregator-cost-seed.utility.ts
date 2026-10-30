import { CostClass } from '../../../generated/prisma';
import {
  AGGREGATOR_CHEAP_BELOW_RATE_MICRO_USD,
  AGGREGATOR_PREMIUM_BELOW_RATE_MICRO_USD,
  AGGREGATOR_STANDARD_BELOW_RATE_MICRO_USD,
} from '../constants/model-cost-seed-aggregators.constants';
import { type AggregatorCostRow, type ModelCostSeedEntry } from '../types/model-cost-seed.types';

/** Cost class by the dearer of the two rates: both 0 FREE, under $1 CHEAP, under $6 STANDARD, under $40 PREMIUM, else ULTRA. */
export function costClassForRates(
  inputPerMillionMicroUsd: number,
  outputPerMillionMicroUsd: number,
): CostClass {
  const dearestRate = Math.max(inputPerMillionMicroUsd, outputPerMillionMicroUsd);
  if (dearestRate === 0) {
    return CostClass.FREE;
  }
  if (dearestRate < AGGREGATOR_CHEAP_BELOW_RATE_MICRO_USD) {
    return CostClass.CHEAP;
  }
  if (dearestRate < AGGREGATOR_STANDARD_BELOW_RATE_MICRO_USD) {
    return CostClass.STANDARD;
  }
  return dearestRate < AGGREGATOR_PREMIUM_BELOW_RATE_MICRO_USD
    ? CostClass.PREMIUM
    : CostClass.ULTRA;
}

export function buildAggregatorCostSeedEntries(
  rows: readonly AggregatorCostRow[],
): readonly ModelCostSeedEntry[] {
  return rows.map(([provider, modelKey, input, output, cachedInput, cacheWrite]) =>
    Object.freeze({
      provider,
      modelKey,
      inputPerMillionMicroUsd: input,
      outputPerMillionMicroUsd: output,
      cachedInputPerMillionMicroUsd: cachedInput,
      cacheWritePerMillionMicroUsd: cacheWrite,
      reasoningPerMillionMicroUsd: null,
      costClass: costClassForRates(input, output),
    }),
  );
}
