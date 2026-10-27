import { createHash } from 'node:crypto';

import {
  EVIDENCE_BUNDLE_MAX_CHARS,
  EVIDENCE_BUNDLE_MAX_ITEMS,
} from '../constants/evidence-gap.constants';
import { PRIMARY_SOURCE_HOSTS } from '../constants/research-queries.constants';
import type { RawEvidenceItem } from '../types/evidence-gap.types';
import type { ResearchQueryResult } from '../types/research-queries.types';
import { normalizeEvidenceUrl } from './citation-id.utility';
import { isCitableEvidenceUrl } from './evidence-merge.utility';
import { stableJson } from './stable-json.utility';
import type { ResearchEvidence } from '../../research/research.client';

function itemsOf(bundle: Record<string, unknown>): RawEvidenceItem[] {
  const items = bundle['items'];
  return Array.isArray(items)
    ? items.filter(
        (item): item is RawEvidenceItem =>
          typeof item === 'object' && item !== null && !Array.isArray(item),
      )
    : [];
}

/** True when the url is on a host that publishes the original paper, standard or repository. */
export function isPrimarySourceUrl(raw: unknown): boolean {
  if (typeof raw !== 'string') return false;
  try {
    const host = new URL(raw).hostname.toLowerCase();
    return PRIMARY_SOURCE_HOSTS.some((primary) => host === primary || host.endsWith(`.${primary}`));
  } catch {
    return false;
  }
}

/** Items taken one per query in turn, so a cap never starves a later query of its first result. */
function interleave(lists: readonly RawEvidenceItem[][]): RawEvidenceItem[] {
  const longest = Math.max(0, ...lists.map((list) => list.length));
  const merged: RawEvidenceItem[] = [];
  for (let rank = 0; rank < longest; rank += 1) {
    for (const list of lists) {
      const item = list.at(rank);
      if (item) merged.push(item);
    }
  }
  return merged;
}

/** Primary-source hosts first; each group keeps its order, so the ranking is stable. */
export function rankPrimarySourcesFirst(items: readonly RawEvidenceItem[]): RawEvidenceItem[] {
  return [
    ...items.filter((item) => isPrimarySourceUrl(item['url'])),
    ...items.filter((item) => !isPrimarySourceUrl(item['url'])),
  ];
}

function keepCitable(items: readonly RawEvidenceItem[]): RawEvidenceItem[] {
  const ids = new Set<string>();
  const pages = new Set<string>();
  const kept: RawEvidenceItem[] = [];
  let size = 0;
  for (const item of items) {
    const { id, url } = item;
    if (typeof id !== 'string' || typeof url !== 'string' || !isCitableEvidenceUrl(url)) continue;
    const page = normalizeEvidenceUrl(url);
    if (ids.has(id) || pages.has(page)) continue;
    const itemSize = stableJson(item).length;
    if (kept.length >= EVIDENCE_BUNDLE_MAX_ITEMS || size + itemSize > EVIDENCE_BUNDLE_MAX_CHARS) {
      continue;
    }
    ids.add(id);
    pages.add(page);
    kept.push(item);
    size += itemSize;
  }
  return kept;
}

/**
 * One evidence bundle from the results of several queries: the first successful run's bundle with
 * its items replaced by every query's items, one per query in turn, primary-source hosts first,
 * the same page or id once, only citable urls, and never past the bundle's item and size caps.
 * Null when no query returned a bundle. A single successful query is returned as it came.
 */
export function combineQueryResults(
  results: readonly ResearchQueryResult[],
): ResearchEvidence | null {
  const answered = results.flatMap(({ evidence }) => (evidence ? [evidence] : []));
  const [first] = answered;
  if (!first) return null;
  if (answered.length === 1) return first;
  const ranked = rankPrimarySourcesFirst(interleave(answered.map(({ bundle }) => itemsOf(bundle))));
  const bundle = { ...first.bundle, items: keepCitable(ranked) };
  return {
    researchRunId: first.researchRunId,
    bundle,
    sha256: createHash('sha256').update(stableJson(bundle)).digest('hex'),
    version: 1,
  };
}
