import { assertIntegerMinor } from './money.utility';

const MICRO_USD_PER_USD_MINOR = 10_000n;

export function usdMinorToMicroUsd(amountMinor: number): bigint {
  assertIntegerMinor(amountMinor, 'amountMinor');
  return BigInt(amountMinor) * MICRO_USD_PER_USD_MINOR;
}

export function calculateMarginMicroUsd(
  revenueMicroUsd: bigint,
  providerCostMicroUsd: bigint,
): bigint {
  return revenueMicroUsd - providerCostMicroUsd;
}

export function sumMicroUsd(amounts: readonly bigint[]): bigint {
  return amounts.reduce((total, amount) => total + amount, 0n);
}
