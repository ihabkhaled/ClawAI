import {
  RATE_MODEL_ID_BATCH_SUFFIX,
  RATE_MODEL_ID_DATED_SUFFIX,
  RATE_MODEL_ID_PATH_PREFIXES,
  RATE_MODEL_ID_VARIANT_MARKER,
} from '../constants/credit.constants';

/**
 * The id a rate is cached and fetched under.
 *
 * Strips only decoration (`models/` prefix, `:batch` mode, `~latest` pointer
 * variants). A dated suffix or a size marker names a different priced model and
 * is kept. Case is kept too: routing matches the exact key first.
 */
export function canonicalRateModelId(model: string): string {
  let id = model.trim();
  const lower = id.toLowerCase();
  const prefix = RATE_MODEL_ID_PATH_PREFIXES.find((candidate) => lower.startsWith(candidate));
  if (prefix !== undefined) {
    id = id.slice(prefix.length);
  }
  if (id.toLowerCase().endsWith(RATE_MODEL_ID_BATCH_SUFFIX)) {
    id = id.slice(0, -RATE_MODEL_ID_BATCH_SUFFIX.length);
  }
  const variantAt = id.indexOf(RATE_MODEL_ID_VARIANT_MARKER);
  if (variantAt > 0) {
    id = id.slice(0, variantAt);
  }
  return id;
}

/**
 * The family a published price can reach: the canonical id minus a trailing
 * release date. Busting every cached key that starts with it covers the dated
 * and variant requests that were priced off that family row.
 */
export function rateModelFamily(model: string): string {
  return canonicalRateModelId(model).replace(RATE_MODEL_ID_DATED_SUFFIX, '');
}
