import { type ModelPricingSource } from '../../../common/enums';

/**
 * The registry columns the cost catalogue needs. A narrow projection on
 * purpose: the full RouterModelRegistryRecord carries ~60 enrichment fields
 * that would be read from disk and thrown away for all 166 rows.
 */
export type RouterModelCatalogEntry = {
  provider: string;
  modelKey: string;
  displayName: string | null;
};

/**
 * One row of "what does every model cost, and which are guesses".
 *
 * Money crosses the wire as `number` micro-USD per million tokens. The columns
 * are BigInt; the conversion happens once, at the boundary, in
 * `toModelCostSnapshot` — a BigInt cannot be serialised to JSON at all, and
 * silently stringifying it would hand the frontend a value it would then be
 * tempted to parse as a float.
 */
export type ModelCostCatalogRow = {
  provider: string;
  modelKey: string;
  displayName: string | null;
  // How the price was resolved — the column the operator acts on.
  pricingSource: ModelPricingSource;
  inputPerMillionMicroUsd: number | null;
  outputPerMillionMicroUsd: number | null;
  cachedInputPerMillionMicroUsd: number | null;
  costClass: string;
  isAdminOverride: boolean;
  version: number;
  lastVerifiedAt: string | null;
};
