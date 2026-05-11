import { CostClass } from '../../../generated/prisma';
import { COST_CLASS_PRICE_THRESHOLDS } from '../constants/scoring.constants';

/// Maps a per-1M-token output price (USD) to a CostClass.
/// Local models always return FREE (price=0).
export function costClassFromPrice(outputPricePer1M: number | null): CostClass | null {
  if (outputPricePer1M === null) return null;
  if (outputPricePer1M <= 0) return CostClass.FREE;
  for (const threshold of COST_CLASS_PRICE_THRESHOLDS) {
    if (outputPricePer1M <= threshold.max) return threshold.class;
  }
  return CostClass.ULTRA;
}
