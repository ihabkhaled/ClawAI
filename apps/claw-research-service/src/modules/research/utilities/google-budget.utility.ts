import {
  GOOGLE_MAX_PAGES_CONFIG_KEY,
  GOOGLE_MAX_PAGES_MAX,
  GOOGLE_MAX_PAGES_MIN,
  GOOGLE_MAX_QUERIES_CONFIG_KEY,
  GOOGLE_MAX_QUERIES_MAX,
  GOOGLE_MAX_QUERIES_MIN,
  GOOGLE_OVERRIDE_REPLACES_FROM_DEPTH,
  GOOGLE_RESULTS_PER_PAGE,
  NO_GOOGLE_ROUTE,
  QUERY_KANA_PATTERN,
  QUERY_SCRIPT_PATTERNS,
  RESEARCH_GOOGLE_BUDGETS,
  RESEARCH_PRIMARY_EXPANSION_ONLY_FROM_ROUND,
} from '../../../common/constants/research-engine.constants';
import { GOOGLE_PROVIDER_KIND } from '../../../common/constants/search.constants';
import { SearchProviderRunStatus } from '../../../common/enums/search-provider-run-status.enum';
import { collapseQuery } from './query-expansion.utility';
import type { SearchExecutionResult } from '../../search/types/search-execution-result.types';
import type {
  GoogleBudget,
  GooglePageRequest,
  GooglePlan,
  GooglePlanInput,
  GoogleRunCounters,
} from '../types/research-engine.types';

/** An override that is an integer inside the range; anything else is no override. */
function integerSetting(config: unknown, key: string, min: number, max: number): number | null {
  if (typeof config !== 'object' || config === null || Array.isArray(config)) {
    return null;
  }
  const value: unknown = new Map(Object.entries(config)).get(key);
  return typeof value === 'number' && Number.isInteger(value) && value >= min && value <= max
    ? value
    : null;
}

/** From depth 3 an override replaces the table value; below it, it can only lower it. */
function capped(tableValue: number, override: number | null, depth: number): number {
  if (override === null) {
    return tableValue;
  }
  return depth >= GOOGLE_OVERRIDE_REPLACES_FROM_DEPTH ? override : Math.min(tableValue, override);
}

/**
 * The Google budget of a run (ADR-228): the depth row (an absent or unknown depth is depth 0), then the SERPAPI
 * provider's `publicConfig` override. Invalid override values are ignored, never an error.
 */
export function resolveGoogleBudget(depth: number | null, publicConfig: unknown): GoogleBudget {
  const effectiveDepth = depth !== null && Number.isInteger(depth) && depth >= 0 ? depth : 0;
  const row = RESEARCH_GOOGLE_BUDGETS.at(effectiveDepth) ?? RESEARCH_GOOGLE_BUDGETS[0];
  const queries = integerSetting(
    publicConfig,
    GOOGLE_MAX_QUERIES_CONFIG_KEY,
    GOOGLE_MAX_QUERIES_MIN,
    GOOGLE_MAX_QUERIES_MAX,
  );
  const pages = integerSetting(
    publicConfig,
    GOOGLE_MAX_PAGES_CONFIG_KEY,
    GOOGLE_MAX_PAGES_MIN,
    GOOGLE_MAX_PAGES_MAX,
  );
  return {
    queries: capped(row?.queries ?? 1, queries, effectiveDepth),
    primaryPages: capped(row?.primaryPages ?? 1, pages, effectiveDepth),
  };
}

/**
 * The script most of a query's letters are in, as an index into `QUERY_SCRIPT_PATTERNS` (any kana = Japanese, one
 * index past the table); -1 when it has no letters of a known script.
 */
export function dominantScriptOf(text: string): number {
  if ((text.match(QUERY_KANA_PATTERN)?.length ?? 0) > 0) {
    return QUERY_SCRIPT_PATTERNS.length;
  }
  let best = -1;
  let bestCount = 0;
  for (const [index, pattern] of QUERY_SCRIPT_PATTERNS.entries()) {
    const count = text.match(pattern)?.length ?? 0;
    if (count > bestCount) {
      best = index;
      bestCount = count;
    }
  }
  return best;
}

/**
 * The expansion queries Google also runs: queries in another script than the primary first (a query in Arabic or
 * Chinese finds pages an English one cannot), then the order given, at most `count`.
 */
export function pickGoogleExpansions(
  primary: string,
  expansions: readonly string[],
  count: number,
): string[] {
  if (count <= 0) {
    return [];
  }
  const primaryScript = dominantScriptOf(primary);
  const differs = (query: string): boolean => {
    const script = dominantScriptOf(query);
    return script !== -1 && script !== primaryScript;
  };
  return [
    ...expansions.filter((query) => differs(query)),
    ...expansions.filter((query) => !differs(query)),
  ].slice(0, count);
}

/** SerpApi `start` offsets of pages 2..N (page 1 is the primary call): 10, 20, ... */
export function googlePageStarts(pages: number): number[] {
  return Array.from(
    { length: Math.max(0, pages - 1) },
    (_, index) => (index + 1) * GOOGLE_RESULTS_PER_PAGE,
  );
}

/**
 * What one run sends to Google. Round 1: the primary (all providers, ADR-210), the best expansions inside the
 * query budget and the primary's extra pages. A follow-up round (>= 2): the round's primary only, one call.
 * No SERPAPI provider, or an override of 0 queries: nothing, and the primary leaves SERPAPI out.
 */
export function planGoogleRun(input: GooglePlanInput): GooglePlan {
  const none: GooglePlan = { primary: NO_GOOGLE_ROUTE, expansions: new Set(), pages: [] };
  if (input.google === null) {
    return none;
  }
  const budget = resolveGoogleBudget(input.depth, input.google.publicConfig);
  if (budget.queries < 1) {
    return none;
  }
  const primary = { providerId: input.google.id };
  if (input.round >= RESEARCH_PRIMARY_EXPANSION_ONLY_FROM_ROUND) {
    return { primary, expansions: new Set(), pages: [] };
  }
  const providerId = input.google.id;
  const pages: GooglePageRequest[] = googlePageStarts(budget.primaryPages).map((start) => ({
    providerId,
    start,
  }));
  const picked = pickGoogleExpansions(
    collapseQuery(input.primary),
    input.expansions,
    budget.queries - 1,
  );
  return { primary, expansions: new Set(picked), pages };
}

/**
 * What Google really answered, from the providers' own outcomes (a cached answer counts: Google contributed it,
 * only no unit was spent): queries with an OK Google outcome, Google answers (one per page), results returned.
 */
export function googleCountsOf(
  queries: readonly SearchExecutionResult[],
  pages: readonly SearchExecutionResult[],
): GoogleRunCounters {
  const answers = (result: SearchExecutionResult): SearchExecutionResult['providers'] =>
    result.providers.filter(
      (outcome) =>
        outcome.kind === GOOGLE_PROVIDER_KIND && outcome.status === SearchProviderRunStatus.OK,
    );
  const all = [...queries, ...pages].flatMap((result) => answers(result));
  return {
    queries: queries.filter((result) => answers(result).length > 0).length,
    pages: all.length,
    results: all.reduce((total, outcome) => total + outcome.resultCount, 0),
  };
}
