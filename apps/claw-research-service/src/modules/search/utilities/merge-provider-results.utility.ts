import { canonicalUrlKey } from './canonical-url.utility';
import {
  SEARCH_AGREEMENT_BONUS,
  SEARCH_RANK_SMOOTHING,
} from '../../../common/constants/search.constants';
import type { SearchResult } from '../types/search.types';

/** One provider's answer, in the order that provider ranked it. */
export type ProviderResultSet = {
  /** Unique provider name; becomes the provenance entry. */
  provider: string;
  results: readonly SearchResult[];
};

/**
 * Every provider's results folded into one ranked list (ADR-210).
 *
 * Scores are NOT comparable across providers: Exa, Brave and an Ollama
 * relevance heuristic each use their own scale, so adding them up (or taking
 * the max) lets whichever provider scores generously win. Each result is
 * therefore re-scored from its RANK inside its own provider's list
 * (`(K+1)/(K+rank)`, 1 for rank 1), which every provider has in common.
 * The provider's own score is ignored; equal ranks keep provider rank order.
 *
 * Dedupe is by canonical URL (see `canonicalUrlKey`). A merged result keeps
 * the richest record (snippet, date), lists every provider that returned it in
 * `providers`, and gets a small bonus per extra provider: agreement is signal,
 * but the bonus is a tie-breaker, not a vote.
 */
export function mergeProviderResults(sets: readonly ProviderResultSet[]): SearchResult[] {
  type Entry = { result: SearchResult; rankScore: number; providers: string[] };
  const byUrl = new Map<string, Entry>();

  for (const set of sets) {
    for (const [index, result] of set.results.entries()) {
      const rankScore = (SEARCH_RANK_SMOOTHING + 1) / (SEARCH_RANK_SMOOTHING + index + 1);
      const key = canonicalUrlKey(result.url);
      const existing = byUrl.get(key);
      if (existing === undefined) {
        byUrl.set(key, { result, rankScore, providers: [set.provider] });
        continue;
      }
      if (!existing.providers.includes(set.provider)) {
        existing.providers.push(set.provider);
      }
      const better = rankScore > existing.rankScore;
      const base = better ? result : existing.result;
      const other = better ? existing.result : result;
      // Keep the richer record: a provider that supplied a snippet or a date
      // told us more about the same page than one that did not.
      existing.result = {
        ...base,
        snippet: base.snippet ?? other.snippet,
        publishedAt: base.publishedAt ?? other.publishedAt,
      };
      existing.rankScore = Math.max(existing.rankScore, rankScore);
    }
  }

  // Sort on the uncapped value so agreement still orders results that would
  // all be clamped to 1; the reported score stays within 0..1.
  return [...byUrl.values()]
    .map(({ result, rankScore, providers }) => ({
      result,
      providers,
      raw: rankScore + SEARCH_AGREEMENT_BONUS * (providers.length - 1),
    }))
    .sort((left, right) => right.raw - left.raw)
    .map(({ result, providers, raw }) => ({ ...result, score: Math.min(1, raw), providers }));
}
