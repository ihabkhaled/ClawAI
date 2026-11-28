import {
  RESEARCH_DEPTH_QUERY_BUDGET,
  RESEARCH_MAX_DEPTH,
  RESEARCH_MAX_ROUNDS,
  RESEARCH_REQUEST_LANGUAGE_PATTERN,
  RESEARCH_REQUEST_MAX_EXCLUDE_URLS,
  RESEARCH_REQUEST_MAX_LANGUAGES,
  RESEARCH_REQUEST_MAX_PLATFORMS,
  RESEARCH_REQUEST_MAX_QUERIES,
  RESEARCH_REQUEST_MAX_ROUND,
  RESEARCH_REQUEST_QUERY_MAX_CHARS,
  RESEARCH_REQUEST_THREAD_ID_MAX_CHARS,
} from '../../../common/constants/research-gate.constants';
import type { ResearchEngineFieldsInput } from '../types/research-orchestration.types';
import type { ResearchRequest, ResearchRunResponse } from '../types/research.types';
import { bundleOf } from './research-orchestration.utility';

/** A depth research-service accepts from chat: an integer 0..`RESEARCH_MAX_DEPTH`; anything unreadable is 0. */
export function clampResearchDepth(depth: number | undefined): number {
  return depth === undefined || !Number.isFinite(depth)
    ? 0
    : Math.min(Math.max(0, Math.round(depth)), RESEARCH_MAX_DEPTH);
}

/** Search rounds a depth allows: depth 0-1 one round, depth 2 two, depth 3 three. */
export function maxRoundsForDepth(depth: number): number {
  return Math.max(1, Math.min(clampResearchDepth(depth), RESEARCH_MAX_ROUNDS));
}

/** Two queries are the same query when they differ only in case and spacing. */
export function researchQueryKey(query: string): string {
  return query.trim().toLowerCase().replaceAll(/\s+/gu, ' ');
}

/** Total queries (primary + expansion) one search run at `depth` may use. */
export function researchQueryBudget(depth: number): number {
  return RESEARCH_DEPTH_QUERY_BUDGET.at(clampResearchDepth(depth)) ?? 1;
}

/**
 * The extra queries a search run sends: the candidates minus the primary query (the planner's query, or the user's
 * message when it wrote none) and minus each other, trimmed, each ≤ 300 chars, at most `limit` (≤ 12) in all.
 */
export function expansionQueries(
  primary: string,
  candidates: readonly string[],
  limit: number = RESEARCH_REQUEST_MAX_QUERIES,
): string[] {
  const seen = new Set<string>([researchQueryKey(primary)]);
  const queries: string[] = [];
  for (const candidate of candidates) {
    const query = candidate.trim().slice(0, RESEARCH_REQUEST_QUERY_MAX_CHARS);
    const key = researchQueryKey(query);
    if (query.length >= 2 && !seen.has(key)) {
      seen.add(key);
      queries.push(query);
    }
  }
  return queries.slice(0, Math.max(0, Math.min(limit, RESEARCH_REQUEST_MAX_QUERIES)));
}

/**
 * Languages research-service accepts: ISO 639 base codes only (`pt-BR` → `pt`, `zh-Hans` → `zh`), lower case,
 * de-duplicated, ≤ 6. The council may name a region or script; the wire contract takes the base language.
 */
export function normaliseResearchLanguages(languages: readonly string[]): string[] {
  const codes = languages
    .map((language) => (language.split('-').at(0) ?? '').trim().toLowerCase())
    .filter((code) => RESEARCH_REQUEST_LANGUAGE_PATTERN.test(code));
  return [...new Set(codes)].slice(0, RESEARCH_REQUEST_MAX_LANGUAGES);
}

/** The key two evidence URLs share when they name the same page: no fragment, no trailing slash, lower case. */
export function evidenceUrlKey(url: string): string {
  return url.trim().replace(/#.*$/u, '').replace(/\/+$/u, '').toLowerCase();
}

/** Every distinct evidence URL a run holds, in order. */
export function evidenceUrls(run: ResearchRunResponse | null): string[] {
  const seen = new Set<string>();
  const urls: string[] = [];
  for (const item of bundleOf(run)?.items ?? []) {
    const key = evidenceUrlKey(item.url);
    if (item.url.length > 0 && !seen.has(key)) {
      seen.add(key);
      urls.push(item.url);
    }
  }
  return urls;
}

/** The run with only the items whose URL is not among `seenUrls`; null when nothing new is left. */
export function newEvidenceOnly(
  run: ResearchRunResponse | null,
  seenUrls: readonly string[],
): ResearchRunResponse | null {
  const bundle = bundleOf(run);
  if (run === null || bundle === null) {
    return null;
  }
  const seen = new Set(seenUrls.map(evidenceUrlKey));
  const items = bundle.items.filter((item) => !seen.has(evidenceUrlKey(item.url)));
  return items.length === 0 ? null : { ...run, bundle: { ...bundle, items } };
}

/**
 * The research engine's request fields (B1/B2) within the wire bounds of the shared contract: thread id ≤ 64 chars,
 * ≤ 12 queries, base language codes ≤ 6, depth 0-3, round 1-5, ≤ 60 excluded URLs. Empty values are left out, so
 * `runResearch` sends exactly the old body when there is nothing to add.
 */
export function buildResearchEngineFields(
  input: ResearchEngineFieldsInput,
): Partial<ResearchRequest> {
  const queries = (input.queries ?? [])
    .map((query) => query.trim().slice(0, RESEARCH_REQUEST_QUERY_MAX_CHARS))
    .filter((query) => query.length > 0)
    .slice(0, RESEARCH_REQUEST_MAX_QUERIES);
  const languages = normaliseResearchLanguages(input.languages ?? []);
  const excludeUrls = [...new Set(input.excludeUrls ?? [])].slice(
    0,
    RESEARCH_REQUEST_MAX_EXCLUDE_URLS,
  );
  const platforms = [...new Set(input.platforms ?? [])].slice(0, RESEARCH_REQUEST_MAX_PLATFORMS);
  const threadId = input.threadId?.trim() ?? '';
  return {
    ...(threadId.length > 0 && threadId.length <= RESEARCH_REQUEST_THREAD_ID_MAX_CHARS
      ? { threadId }
      : {}),
    ...(queries.length > 0 ? { queries } : {}),
    ...(languages.length > 0 ? { languages } : {}),
    ...(platforms.length > 0 ? { platforms } : {}),
    ...(input.depth === undefined ? {} : { depth: clampResearchDepth(input.depth) }),
    ...(input.round === undefined
      ? {}
      : { round: Math.min(Math.max(1, Math.round(input.round)), RESEARCH_REQUEST_MAX_ROUND) }),
    ...(excludeUrls.length > 0 ? { excludeUrls } : {}),
  };
}
