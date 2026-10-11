import { ModelPricingSource } from '../../../common/enums';
import {
  type ModelCostCatalogRow,
  type UnpricedModelPage,
  type UnpricedModelRow,
} from '../types/model-cost-catalog.types';

/** A price that is missing, or only a pessimistic stand-in, needs a human. */
export function needsRealPrice(source: ModelPricingSource): boolean {
  return source === ModelPricingSource.UNPRICED || source === ModelPricingSource.PROVIDER_FALLBACK;
}

export function toUnpricedRow(row: ModelCostCatalogRow, inRegistry: boolean): UnpricedModelRow {
  return {
    provider: row.provider,
    modelKey: row.modelKey,
    displayName: row.displayName,
    pricingSource: row.pricingSource,
    inRegistry,
  };
}

/** Search (case-insensitive over provider, key, name), stable sort, then slice one page. */
export function paginateUnpriced(
  rows: readonly UnpricedModelRow[],
  page: number,
  pageSize: number,
  search: string | undefined,
): UnpricedModelPage {
  const needle = search?.toLowerCase();
  const matching =
    needle === undefined
      ? [...rows]
      : rows.filter((row) =>
          [row.provider, row.modelKey, row.displayName ?? ''].some((field) =>
            field.toLowerCase().includes(needle),
          ),
        );
  matching.sort(
    (a, b) => a.provider.localeCompare(b.provider) || a.modelKey.localeCompare(b.modelKey),
  );
  const start = (page - 1) * pageSize;
  return {
    items: matching.slice(start, start + pageSize),
    total: matching.length,
    page,
    pageSize,
  };
}
