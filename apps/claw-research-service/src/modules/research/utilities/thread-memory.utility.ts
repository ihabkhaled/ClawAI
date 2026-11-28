import {
  RESEARCH_SOURCE_READ_STATUS,
  SIGNIFICANT_TOKEN_MIN_LENGTH,
  SIGNIFICANT_TOKEN_PATTERN,
  SIGNIFICANT_TOKEN_STOPWORDS,
  THREAD_MEMORY_MIN_SHARED_TOKENS,
  THREAD_MEMORY_OVERLAP_EXCERPT_CHARS,
  THREAD_MEMORY_WINDOW_MS,
} from '../../../common/constants/research-engine.constants';
import { sha1Short } from '../../../common/utilities/hash.utility';
import type { ResearchSource } from '../../../generated/prisma';
import type { EvidenceItem } from '../types/evidence-bundle.types';
import type { ThreadMemory } from '../types/research-engine.types';

/**
 * Distinct significant tokens of a text, lower-cased. Unicode-aware: a token is
 * a run of letters, digits and combining marks, so Arabic, Cyrillic, Devanagari
 * and accented Latin words survive. Short tokens and filler words are dropped.
 */
export function significantTokens(text: string): Set<string> {
  const tokens = new Set<string>();
  for (const match of text.toLowerCase().matchAll(SIGNIFICANT_TOKEN_PATTERN)) {
    const token = match[0];
    if (
      [...token].length >= SIGNIFICANT_TOKEN_MIN_LENGTH &&
      !SIGNIFICANT_TOKEN_STOPWORDS.has(token)
    ) {
      tokens.add(token);
    }
  }
  return tokens;
}

/** How many tokens two sets share. */
export function sharedTokenCount(left: ReadonlySet<string>, right: ReadonlySet<string>): number {
  let shared = 0;
  for (const token of left) {
    if (right.has(token)) {
      shared += 1;
    }
  }
  return shared;
}

/**
 * Indexes this thread's rows (newest first, as loaded). `readByKey` holds the
 * most recent row per URL whose page was actually READ (fetch status OK)
 * within the window; `rows` keeps one row per URL for overlap picking, a read
 * page preferred over a bare search hit.
 */
export function buildThreadMemory(rows: readonly ResearchSource[], now: Date): ThreadMemory {
  const since = now.getTime() - THREAD_MEMORY_WINDOW_MS;
  const readByKey = new Map<string, ResearchSource>();
  const byKey = new Map<string, ResearchSource>();
  for (const row of rows) {
    const read = row.fetchStatus === RESEARCH_SOURCE_READ_STATUS;
    if (read && row.retrievedAt.getTime() >= since && !readByKey.has(row.canonicalKey)) {
      readByKey.set(row.canonicalKey, row);
    }
    const kept = byKey.get(row.canonicalKey);
    if (kept === undefined || (read && kept.fetchStatus !== RESEARCH_SOURCE_READ_STATUS)) {
      byKey.set(row.canonicalKey, row);
    }
  }
  return { readByKey, rows: [...byKey.values()] };
}

/** The text an earlier source is judged by: its title, its query and the start of its excerpt. */
export function overlapTokensOf(row: ResearchSource): Set<string> {
  const head = row.excerpt.slice(0, THREAD_MEMORY_OVERLAP_EXCERPT_CHARS);
  return significantTokens(`${row.title ?? ''} ${row.query ?? ''} ${head}`);
}

/**
 * Up to `max` earlier sources worth adding to this run: not already present
 * (`excludeKeys`), sharing at least `THREAD_MEMORY_MIN_SHARED_TOKENS` distinct
 * significant tokens with the intent. Most shared tokens first, then the
 * higher stored score.
 */
export function pickThreadExtras(
  memory: ThreadMemory,
  intent: string,
  excludeKeys: ReadonlySet<string>,
  max: number,
): ResearchSource[] {
  const intentTokens = significantTokens(intent);
  const eligible = intentTokens.size >= THREAD_MEMORY_MIN_SHARED_TOKENS && max > 0;
  const candidates = eligible ? memory.rows : [];
  return candidates
    .filter((row) => !excludeKeys.has(row.canonicalKey))
    .map((row) => ({ row, shared: sharedTokenCount(intentTokens, overlapTokensOf(row)) }))
    .filter(({ shared }) => shared >= THREAD_MEMORY_MIN_SHARED_TOKENS)
    .sort((left, right) => right.shared - left.shared || right.row.score - left.row.score)
    .slice(0, max)
    .map(({ row }) => row);
}

/**
 * An evidence item served from a stored row: no fetch now, so no `fetch`
 * provenance and no `fetchStatus`; `reusedFromRunId` says where it came from.
 */
export function reusedEvidenceFrom(
  row: ResearchSource,
  confidence: number,
  idPrefix: string,
): EvidenceItem {
  return {
    id: sha1Short(`${idPrefix}:${row.url}`),
    title: row.title,
    url: row.url,
    snippet: row.excerpt,
    source: row.fetchStatus === RESEARCH_SOURCE_READ_STATUS ? 'fetch' : 'search',
    providerKind: row.providerKind,
    publishedAt: row.publishedAt?.toISOString() ?? null,
    fetchedAt: row.retrievedAt.toISOString(),
    confidence,
    reusedFromRunId: row.runId,
  };
}
