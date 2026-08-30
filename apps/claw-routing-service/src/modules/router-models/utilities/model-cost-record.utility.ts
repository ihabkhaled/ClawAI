import { type ModelCostRates } from '@claw/shared-types';
import { type ModelCostVersion } from '../../../generated/prisma';
import { PRISMA_TO_SHARED_COST_CLASS } from '../constants/model-cost.constants';
import { type ModelCostRateInput, type ModelCostSnapshot } from '../types/model-cost.types';

// Widens a validated per-million rate to the BigInt the column stores. Null
// stays null: "unknown" must never collapse into "zero", which would price the
// modality as free.
export function toBigInt(value: number | null): bigint | null {
  return value === null ? null : BigInt(value);
}

// BigInt → number at the boundary. Every rate is micro-USD per million tokens,
// which for even the most expensive frontier model is ~10^8 — comfortably
// inside the safe-integer range. The DB column stays BigInt so a future
// repricing cannot overflow it, and the conversion is checked rather than
// assumed.
function toSafeNumber(value: bigint | null): number | null {
  if (value === null) {
    return null;
  }
  if (value > BigInt(Number.MAX_SAFE_INTEGER) || value < 0n) {
    throw new RangeError('model cost rate is outside the safe integer range');
  }
  return Number(value);
}

// A model is PRICED when both the input and output rates are known. Anything
// less cannot bound a request's cost, and an unbounded cost on a limited plan is
// a liability — never a free model.
export function toModelCostSnapshot(record: ModelCostVersion): ModelCostSnapshot {
  const rates: ModelCostRates = {
    provider: record.provider,
    model: record.modelKey,
    version: record.version,
    currency: record.currency,
    inputPerMillionMicroUsd: toSafeNumber(record.inputPerMillionMicroUsd),
    outputPerMillionMicroUsd: toSafeNumber(record.outputPerMillionMicroUsd),
    cachedInputPerMillionMicroUsd: toSafeNumber(record.cachedInputPerMillionMicroUsd),
    cacheWritePerMillionMicroUsd: toSafeNumber(record.cacheWritePerMillionMicroUsd),
    reasoningPerMillionMicroUsd: toSafeNumber(record.reasoningPerMillionMicroUsd),
    imagePerUnitMicroUsd: toSafeNumber(record.imagePerUnitMicroUsd),
    audioPerUnitMicroUsd: toSafeNumber(record.audioPerUnitMicroUsd),
    videoPerUnitMicroUsd: toSafeNumber(record.videoPerUnitMicroUsd),
    toolCallPerUnitMicroUsd: toSafeNumber(record.toolCallPerUnitMicroUsd),
    searchCallPerUnitMicroUsd: toSafeNumber(record.searchCallPerUnitMicroUsd),
    costClass: PRISMA_TO_SHARED_COST_CLASS[record.costClass],
    isAdminOverride: record.isAdminOverride,
    effectiveFrom: record.effectiveFrom.toISOString(),
    lastVerifiedAt: record.lastVerifiedAt ? record.lastVerifiedAt.toISOString() : null,
    source: record.source,
  };
  return {
    ...rates,
    isPriced: rates.inputPerMillionMicroUsd !== null && rates.outputPerMillionMicroUsd !== null,
    // A row read from the registry IS this model's own published price.
    // Only providerFallbackSnapshot sets this true.
    isFallbackRate: false,
    localComputeOwnership: record.localComputeOwnership,
  };
}

// True when a synced rate set is byte-for-byte what is already stored, so the
// sync can refresh `lastVerifiedAt` instead of minting a pointless new version.
export function ratesAreUnchanged(record: ModelCostVersion, incoming: ModelCostRateInput): boolean {
  return (
    record.inputPerMillionMicroUsd === incoming.inputPerMillionMicroUsd &&
    record.outputPerMillionMicroUsd === incoming.outputPerMillionMicroUsd &&
    record.cachedInputPerMillionMicroUsd === incoming.cachedInputPerMillionMicroUsd &&
    record.cacheWritePerMillionMicroUsd === incoming.cacheWritePerMillionMicroUsd &&
    record.reasoningPerMillionMicroUsd === incoming.reasoningPerMillionMicroUsd &&
    record.imagePerUnitMicroUsd === incoming.imagePerUnitMicroUsd &&
    record.audioPerUnitMicroUsd === incoming.audioPerUnitMicroUsd &&
    record.videoPerUnitMicroUsd === incoming.videoPerUnitMicroUsd &&
    record.toolCallPerUnitMicroUsd === incoming.toolCallPerUnitMicroUsd &&
    record.searchCallPerUnitMicroUsd === incoming.searchCallPerUnitMicroUsd
  );
}
