import {
  CostClass,
  CostConfidence,
  ModelCostSource,
  type ModelCostVersion,
} from '../../../generated/prisma';
import {
  SYNCED_PRICE_MAX_CHANGE_FACTOR,
  SYNCED_PRICE_MAX_MICRO_USD_PER_MTOK,
} from '../constants/model-cost.constants';
import {
  type PublishedModelPrices,
  type PublishModelCostInput,
  type SyncedPriceRejection,
} from '../types/model-cost.types';

function isUsablePrice(value: number | undefined): value is number {
  return (
    value !== undefined &&
    Number.isSafeInteger(value) &&
    value > 0 &&
    value <= SYNCED_PRICE_MAX_MICRO_USD_PER_MTOK
  );
}

function hasUnitPrice(active: ModelCostVersion): boolean {
  return (
    active.imagePerUnitMicroUsd !== null ||
    active.audioPerUnitMicroUsd !== null ||
    active.videoPerUnitMicroUsd !== null ||
    active.ttsPerCharacterMicroUsd !== null
  );
}

function isImplausibleMove(previous: bigint | null, next: number): boolean {
  if (previous === null || previous <= 0n) {
    return false;
  }
  const incoming = BigInt(next);
  const factor = BigInt(SYNCED_PRICE_MAX_CHANGE_FACTOR);
  return incoming > previous * factor || incoming * factor < previous;
}

/**
 * Turns provider-published token prices into a publishable rate set, or says
 * why not.
 *
 * Precedence ADMIN_OVERRIDE > PROVIDER_SYNC > SEED: an administrator pin and a
 * provider-reported cost are never replaced; a seeded list price is. Zero,
 * negative, non-integer and absurd prices are refused (a zero would make a
 * model free), as are per-unit (image/audio/video/tts) rows, which a token
 * price cannot describe. Columns the provider does not publish are carried over
 * from the active row so a sync never erases a cache-write or reasoning rate.
 */
export function buildSyncedPriceInput(
  prices: PublishedModelPrices,
  active: ModelCostVersion | null,
): PublishModelCostInput | SyncedPriceRejection {
  const { inputPerMillionMicroUsd: input, outputPerMillionMicroUsd: output } = prices;
  if (!isUsablePrice(input) || !isUsablePrice(output)) {
    return { applied: false, reason: 'INVALID_PRICE' };
  }
  const cached = prices.cachedInputPerMillionMicroUsd;
  if (cached !== undefined && !isUsablePrice(cached)) {
    return { applied: false, reason: 'INVALID_PRICE' };
  }
  if (active !== null) {
    if (active.isAdminOverride || active.source === ModelCostSource.ADMIN_OVERRIDE) {
      return { applied: false, reason: 'ADMIN_OVERRIDE_ACTIVE' };
    }
    if (active.source === ModelCostSource.PROVIDER_REPORTED) {
      return { applied: false, reason: 'PROVIDER_REPORTED_ACTIVE' };
    }
    if (hasUnitPrice(active)) {
      return { applied: false, reason: 'NOT_A_TOKEN_MODEL' };
    }
    if (
      isImplausibleMove(active.inputPerMillionMicroUsd, input) ||
      isImplausibleMove(active.outputPerMillionMicroUsd, output)
    ) {
      return { applied: false, reason: 'IMPLAUSIBLE_CHANGE' };
    }
  }
  return {
    provider: prices.provider,
    modelKey: prices.modelKey,
    currency: active?.currency ?? 'USD',
    inputPerMillionMicroUsd: BigInt(input),
    outputPerMillionMicroUsd: BigInt(output),
    cachedInputPerMillionMicroUsd:
      cached === undefined ? (active?.cachedInputPerMillionMicroUsd ?? null) : BigInt(cached),
    cacheWritePerMillionMicroUsd: active?.cacheWritePerMillionMicroUsd ?? null,
    reasoningPerMillionMicroUsd: active?.reasoningPerMillionMicroUsd ?? null,
    imagePerUnitMicroUsd: null,
    audioPerUnitMicroUsd: null,
    videoPerUnitMicroUsd: null,
    toolCallPerUnitMicroUsd: active?.toolCallPerUnitMicroUsd ?? null,
    searchCallPerUnitMicroUsd: active?.searchCallPerUnitMicroUsd ?? null,
    ttsPerCharacterMicroUsd: null,
    costClass: active?.costClass ?? CostClass.STANDARD,
    confidence: CostConfidence.EXACT,
    source: ModelCostSource.PROVIDER_SYNC,
    isAdminOverride: false,
    localComputeOwnership: null,
    createdByUserId: null,
    notes: 'Published by the provider model listing',
  };
}

export function isRejection(
  value: PublishModelCostInput | SyncedPriceRejection,
): value is SyncedPriceRejection {
  return 'applied' in value;
}
