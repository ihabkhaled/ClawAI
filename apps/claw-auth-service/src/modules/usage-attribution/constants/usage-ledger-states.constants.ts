import { WeightedUsageState } from '../../../generated/prisma';

/**
 * Ledger states an attribution counts. The same states the quota meter sums,
 * so the breakdown and the day/week/month windows add up to the same ledger.
 */
export const USAGE_COUNTED_STATES: WeightedUsageState[] = [
  WeightedUsageState.RESERVED,
  WeightedUsageState.FINALIZED,
];
