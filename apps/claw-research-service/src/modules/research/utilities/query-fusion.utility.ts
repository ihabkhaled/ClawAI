import { RESEARCH_RRF_K } from '../../../common/constants/research-engine.constants';
import { canonicalUrlKey } from './fetch-targets.utility';
import type { PlatformTaggedResult } from '../../platforms/types/platform.types';
import type { FusedSearchResult, QueryResultSet } from '../types/research-engine.types';

/**
 * Folds several queries' ranked answers into one list (research engine B2).
 *
 * Reciprocal-rank fusion: a page scores `sum over queries of 1 / (K + rank)`,
 * so a page several queries agree on rises, and no provider's own score scale
 * leaks in. Dedupe by `canonicalUrlKey`. The kept record is the first query's
 * (primary first), enriched with a snippet, date or platform tag (B3) another
 * set supplied; `query` names that first query; `providers` is the union.
 * Scores are normalised so the best page is 1. Ties keep query-then-rank order.
 *
 * Deeper results pages of one query (ADR-228) are separate sets sharing a `group`
 * with the query's own set and a `rankOffset` (the ranks above them): a page found
 * on page 1 AND page 2 counts once, at its first rank, never as agreement.
 */
export function fuseQueryResults(sets: readonly QueryResultSet[]): FusedSearchResult[] {
  const byKey = new Map<
    string,
    { result: PlatformTaggedResult; query: string; rrf: number; providers: Set<string> }
  >();
  const counted = new Set<string>();
  for (const set of sets) {
    for (const [index, result] of set.results.entries()) {
      const key = canonicalUrlKey(result.url);
      const groupKey = set.group === undefined ? null : `${set.group}\n${key}`;
      const repeat = groupKey !== null && counted.has(groupKey);
      if (groupKey !== null) {
        counted.add(groupKey);
      }
      const contribution = repeat
        ? 0
        : (set.weight ?? 1) / (RESEARCH_RRF_K + (set.rankOffset ?? 0) + index + 1);
      const entry = byKey.get(key);
      if (entry === undefined) {
        byKey.set(key, {
          result,
          query: set.query,
          rrf: contribution,
          providers: new Set(result.providers ?? []),
        });
        continue;
      }
      entry.rrf += contribution;
      entry.result = {
        ...entry.result,
        snippet: entry.result.snippet ?? result.snippet,
        publishedAt: entry.result.publishedAt ?? result.publishedAt,
        ...(entry.result.platform === undefined && result.platform !== undefined
          ? { platform: result.platform, platformCategory: result.platformCategory }
          : {}),
      };
      for (const provider of result.providers ?? []) {
        entry.providers.add(provider);
      }
    }
  }
  const entries = [...byKey.values()];
  const top = Math.max(0, ...entries.map((entry) => entry.rrf));
  return entries
    .sort((left, right) => right.rrf - left.rrf)
    .map((entry) => ({
      ...entry.result,
      score: top > 0 ? entry.rrf / top : 0,
      query: entry.query,
      ...(entry.providers.size > 0 ? { providers: [...entry.providers] } : {}),
    }));
}
