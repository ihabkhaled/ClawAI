import {
  GOOGLE_PROVIDER_KIND,
  SEARCH_EXPANSION_CONFIG_KEY,
  SEARCH_EXPANSION_PROVIDER_KINDS,
} from '../../../common/constants/search.constants';
import type { SearchProvider } from '../../../generated/prisma';
import type { GoogleRoute, ProviderSelection } from '../types/search-provider-selection.types';

/**
 * May this provider run an EXPANSION query (research engine B2 cost rule)?
 * `publicConfig.expansion` decides when it is a boolean (true = use, false =
 * never); otherwise the kind does (`SEARCH_EXPANSION_PROVIDER_KINDS`). The
 * primary query is unaffected: it always runs on every provider (ADR-210).
 */
export function isExpansionProvider(
  provider: Pick<SearchProvider, 'kind' | 'publicConfig'>,
): boolean {
  const config = provider.publicConfig;
  if (typeof config === 'object' && config !== null && !Array.isArray(config)) {
    const flag = new Map(Object.entries(config)).get(SEARCH_EXPANSION_CONFIG_KEY);
    if (typeof flag === 'boolean') {
      return flag;
    }
  }
  return SEARCH_EXPANSION_PROVIDER_KINDS.has(provider.kind);
}

/** Is this the Google provider (SERPAPI, engine=google)? */
export function isGoogleProvider(provider: Pick<SearchProvider, 'kind'>): boolean {
  return provider.kind === GOOGLE_PROVIDER_KIND;
}

/**
 * The selection narrowed to expansion providers, rank order kept; null when none qualifies.
 *
 * With a Google route (research engine, ADR-228) the route alone decides SERPAPI: only the routed provider joins
 * (`providerId`), or none does (`null`); `publicConfig.expansion` no longer applies to it, because the Google
 * budget is the one control of what Google is asked. No other paid provider ever joins.
 */
export function narrowToExpansionProviders(
  selection: ProviderSelection,
  google?: GoogleRoute,
): ProviderSelection | null {
  const candidates = selection.candidates.filter((provider) =>
    google !== undefined && isGoogleProvider(provider)
      ? provider.id === google.providerId
      : isExpansionProvider(provider),
  );
  const primary = candidates[0];
  return primary === undefined ? null : { ...selection, primary, candidates };
}

/** The selection with every SERPAPI provider left out (a Google budget of 0); null when nothing is left. */
export function withoutGoogleProviders(selection: ProviderSelection): ProviderSelection | null {
  const candidates = selection.candidates.filter((provider) => !isGoogleProvider(provider));
  const primary = candidates[0];
  return primary === undefined ? null : { ...selection, primary, candidates };
}
