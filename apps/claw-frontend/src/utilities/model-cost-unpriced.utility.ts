import { ModelPriceBasis } from '@/enums/model-price-basis.enum';
import type { ModelCostCatalogRow, UnpricedModelRow } from '@/types/model-cost.types';

/** At least one page, so "page 1 of 1" renders for an empty list. */
export function countUnpricedPages(total: number, pageSize: number): number {
  return Math.max(1, Math.ceil(total / pageSize));
}

/**
 * The edit dialog speaks catalogue rows. An unpriced model has no rates and no
 * version, so it opens the same dialog with blanks (the cost class is STANDARD
 * until the operator picks one) and publishes under its provider and model key.
 */
export function unpricedRowToCatalogRow(row: UnpricedModelRow): ModelCostCatalogRow {
  return {
    provider: row.provider,
    modelKey: row.modelKey,
    displayName: row.displayName,
    pricingSource: row.pricingSource,
    priceBasis: null,
    inputPerMillionMicroUsd: null,
    outputPerMillionMicroUsd: null,
    cachedInputPerMillionMicroUsd: null,
    costClass: 'STANDARD',
    isAdminOverride: false,
    version: 0,
    lastVerifiedAt: null,
  };
}

/** Narrows the wire value to the enum; anything unknown renders no badge. */
export function toModelPriceBasis(value: string | null | undefined): ModelPriceBasis | null {
  return Object.values(ModelPriceBasis).find((member) => member === value) ?? null;
}
