import { CostClass } from '../../../generated/prisma';
import {
  AGGREGATOR_CHEAP_BELOW_OUTPUT_MICRO_USD,
  AGGREGATOR_PREMIUM_BELOW_OUTPUT_MICRO_USD,
  AGGREGATOR_STANDARD_BELOW_OUTPUT_MICRO_USD,
} from '../constants/model-cost-seed-aggregators.constants';
import { type AggregatorCostRow, type ModelCostSeedEntry } from '../types/model-cost-seed.types';

/** Cost class by output price: 0 FREE, under $1 CHEAP, under $6 STANDARD, under $40 PREMIUM, else ULTRA. */
export function costClassForOutputRate(outputPerMillionMicroUsd: number): CostClass {
  if (outputPerMillionMicroUsd === 0) {
    return CostClass.FREE;
  }
  if (outputPerMillionMicroUsd < AGGREGATOR_CHEAP_BELOW_OUTPUT_MICRO_USD) {
    return CostClass.CHEAP;
  }
  if (outputPerMillionMicroUsd < AGGREGATOR_STANDARD_BELOW_OUTPUT_MICRO_USD) {
    return CostClass.STANDARD;
  }
  return outputPerMillionMicroUsd < AGGREGATOR_PREMIUM_BELOW_OUTPUT_MICRO_USD
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
      costClass: costClassForOutputRate(output),
    }),
  );
}
