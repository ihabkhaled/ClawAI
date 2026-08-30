import { ModelPricingSource } from '../../../common/enums';
import { type ModelCostSnapshot } from '../types/model-cost.types';
import {
  type ModelCostCatalogRow,
  type RouterModelCatalogEntry,
} from '../types/model-cost-catalog.types';

/**
 * Reads back WHICH branch of `ModelCostService.getSnapshot` produced this
 * snapshot. Deliberately derived from the snapshot rather than re-implemented:
 * a second copy of the resolution order would drift, and the operator would be
 * told a model is priced when the wallet says otherwise.
 *
 * Order matters. `isFallbackRate` is checked first because a fallback snapshot
 * is a real record's rates wearing another model's identity — every other
 * field looks exactly like a published price.
 */
export function resolvePricingSource(
  entry: RouterModelCatalogEntry,
  snapshot: ModelCostSnapshot,
): ModelPricingSource {
  if (snapshot.isFallbackRate) {
    return ModelPricingSource.PROVIDER_FALLBACK;
  }
  // Version 0 is the synthesised snapshot: no row was read at all. It is
  // either the local-compute rate the platform configured, or nothing.
  if (snapshot.version === 0) {
    return snapshot.isPriced ? ModelPricingSource.LOCAL_FREE : ModelPricingSource.UNPRICED;
  }
  // A stored row whose input/output pair is incomplete cannot bound a
  // request's cost, so the wallet treats it as unpriced and so must the table.
  if (!snapshot.isPriced) {
    return ModelPricingSource.UNPRICED;
  }
  // The row was found under a DIFFERENT key than the registry holds — an alias
  // hit, not this model's own price. Compared case-insensitively because
  // `normalizeModelId` lower-cases, and a pure case difference is the same key.
  if (snapshot.model.toLowerCase() !== entry.modelKey.toLowerCase()) {
    return ModelPricingSource.DATED_FAMILY;
  }
  return ModelPricingSource.PUBLISHED;
}

export function toModelCostCatalogRow(
  entry: RouterModelCatalogEntry,
  snapshot: ModelCostSnapshot,
): ModelCostCatalogRow {
  return {
    provider: entry.provider,
    modelKey: entry.modelKey,
    displayName: entry.displayName,
    pricingSource: resolvePricingSource(entry, snapshot),
    inputPerMillionMicroUsd: snapshot.inputPerMillionMicroUsd,
    outputPerMillionMicroUsd: snapshot.outputPerMillionMicroUsd,
    cachedInputPerMillionMicroUsd: snapshot.cachedInputPerMillionMicroUsd,
    costClass: snapshot.costClass,
    isAdminOverride: snapshot.isAdminOverride,
    version: snapshot.version,
    lastVerifiedAt: snapshot.lastVerifiedAt,
  };
}
