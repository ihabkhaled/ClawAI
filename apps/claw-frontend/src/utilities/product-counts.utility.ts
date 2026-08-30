import { PRODUCT_COUNTS, PRODUCT_COUNT_TOKENS } from '@/constants/product-counts.constants';

/**
 * Substitutes every product-count placeholder in a translated string.
 *
 * `replaceAll`, and every token every time, so a sentence may use a count twice
 * or use two different counts — a half-substituted string would ship
 * `{connectorCount}` to a reader, which is worse than a stale number because it
 * is visibly broken.
 *
 * Locale-aware digits are deliberately NOT applied. `Intl.NumberFormat` would
 * render Arabic-Indic digits for `ar` and `fa`, and the surrounding copy in
 * those locales already uses Western digits for version numbers and model
 * names; mixing the two inside one sentence reads worse than either alone.
 */
export function formatProductCounts(template: string): string {
  return template
    .replaceAll(PRODUCT_COUNT_TOKENS.cloudProviders, String(PRODUCT_COUNTS.cloudProviders))
    .replaceAll(PRODUCT_COUNT_TOKENS.localRuntimes, String(PRODUCT_COUNTS.localRuntimes))
    .replaceAll(PRODUCT_COUNT_TOKENS.connectors, String(PRODUCT_COUNTS.connectors))
    .replaceAll(PRODUCT_COUNT_TOKENS.routingModes, String(PRODUCT_COUNTS.routingModes))
    .replaceAll(PRODUCT_COUNT_TOKENS.orchestrationLabs, String(PRODUCT_COUNTS.orchestrationLabs));
}

/** True when a string still carries an unsubstituted placeholder. Used by tests. */
export function hasUnresolvedProductCount(value: string): boolean {
  return Object.values(PRODUCT_COUNT_TOKENS).some((token) => value.includes(token));
}
