import { type SearchResult } from '../types/search.types';

/**
 * One result set per provider, folded into a single ranked list.
 *
 * Search ran as a fallback CHAIN: the first provider that answered won and the
 * rest were never called. That is the right shape for availability and the
 * wrong one for quality — each provider indexes a different slice of the web,
 * so taking only the first answer throws away everything the others found.
 *
 * Dedupe is by normalised URL, not by id: two providers return the same page
 * with different tracking parameters and different title casing, and treating
 * those as two results would let one page occupy the whole first page of
 * findings.
 *
 * Agreement is signal. A URL that several independent providers returned is
 * more likely to be relevant than one only a single provider surfaced, so the
 * merged score is the best score it achieved anywhere plus a small bonus per
 * additional provider that also found it. The bonus is deliberately small: it
 * breaks ties between comparable results, it does not let three weak hits
 * outrank one strong one.
 */
export function mergeProviderResults(resultSets: readonly SearchResult[][]): SearchResult[] {
  const byUrl = new Map<string, { result: SearchResult; providers: Set<string> }>();

  for (const results of resultSets) {
    for (const result of results) {
      const key = normalizeUrlForDedupe(result.url);
      const existing = byUrl.get(key);
      if (existing === undefined) {
        byUrl.set(key, { result, providers: new Set([String(result.providerKind)]) });
        continue;
      }
      existing.providers.add(String(result.providerKind));
      // Keep the richer record: a provider that supplied a snippet or a
      // publish date told us more about the same page than one that did not.
      if (result.score > existing.result.score) {
        existing.result = { ...result, snippet: result.snippet ?? existing.result.snippet };
      } else if (existing.result.snippet === null && result.snippet !== null) {
        existing.result = { ...existing.result, snippet: result.snippet };
      }
    }
  }

  return [...byUrl.values()]
    .map(({ result, providers }) => ({
      ...result,
      score: Math.min(1, result.score + AGREEMENT_BONUS * (providers.size - 1)),
    }))
    .sort((left, right) => right.score - left.score);
}

/** Small on purpose — a tie-breaker, not a way for weak consensus to win. */
const AGREEMENT_BONUS = 0.05;

/**
 * Same page, same key.
 *
 * Strips the scheme, a leading www, tracking parameters and a trailing slash,
 * and lowercases the host. Keeps the path case: plenty of sites serve
 * different content from paths that differ only in case.
 */
function normalizeUrlForDedupe(rawUrl: string): string {
  try {
    const url = new URL(rawUrl);
    for (const key of [...url.searchParams.keys()]) {
      if (key.toLowerCase().startsWith('utm_') || TRACKING_PARAMS.has(key.toLowerCase())) {
        url.searchParams.delete(key);
      }
    }
    const host = url.host.toLowerCase().replace(/^www\./u, '');
    const path = url.pathname.replace(/\/$/u, '');
    return `${host}${path}${url.search}`;
  } catch {
    // Not parseable as a URL — compare it as the opaque string it is rather
    // than dropping the result.
    return rawUrl.trim().toLowerCase();
  }
}

const TRACKING_PARAMS: ReadonlySet<string> = new Set([
  'fbclid',
  'gclid',
  'msclkid',
  'mc_cid',
  'mc_eid',
  'ref',
  'ref_src',
]);
