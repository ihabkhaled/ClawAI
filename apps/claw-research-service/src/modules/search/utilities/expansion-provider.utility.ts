import {
  SEARCH_EXPANSION_CONFIG_KEY,
  SEARCH_EXPANSION_PROVIDER_KINDS,
} from '../../../common/constants/search.constants';
import type { SearchProvider } from '../../../generated/prisma';
import type { ProviderSelection } from '../types/search-provider-selection.types';

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

/** The selection narrowed to expansion providers, rank order kept; null when none qualifies. */
export function narrowToExpansionProviders(selection: ProviderSelection): ProviderSelection | null {
  const candidates = selection.candidates.filter((provider) => isExpansionProvider(provider));
  const primary = candidates[0];
  return primary === undefined ? null : { ...selection, primary, candidates };
}
