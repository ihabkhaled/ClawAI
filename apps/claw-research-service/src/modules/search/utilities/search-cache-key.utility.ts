import { SEARCH_CACHE_KEY_PREFIX } from '../../../common/constants/search.constants';
import { normaliseForHash } from '../../../common/utilities/content-hash.utility';
import { sha256Hex } from '../../../common/utilities/hash.utility';

/**
 * `research:search:v1:<sha256(normalised query|sorted provider ids|maxResults)>`.
 * The same question to the same providers is the same answer for the TTL;
 * a different provider set (one added, enabled or disabled) is a new key.
 * A language filter (research engine B3, platform runs only) is appended as
 * `|lang=<code>`, so a language-scoped answer never serves an unscoped one
 * (it is also the `hl` SerpApi's Google gets, ADR-228); a deeper Google results
 * page (`start` 10, 20, ...) is appended as `|start=<n>`, so pages never collide.
 * Without either the key is exactly the B2 key.
 */
export function searchCacheKey(
  query: string,
  providerIds: readonly string[],
  maxResults: number,
  language: string | null = null,
  start = 0,
): string {
  const ids = [...providerIds].sort((left, right) => left.localeCompare(right)).join(',');
  const scope =
    (language === null ? '' : `|lang=${language}`) + (start > 0 ? `|start=${String(start)}` : '');
  return `${SEARCH_CACHE_KEY_PREFIX}${sha256Hex(`${normaliseForHash(query)}|${ids}|${String(maxResults)}${scope}`)}`;
}

/** The `language` search filter when it is a string (SearXNG reads it); null otherwise. */
export function languageFilterOf(filters: Record<string, unknown> | undefined): string | null {
  const value = filters?.['language'];
  return typeof value === 'string' && value.length > 0 ? value : null;
}
