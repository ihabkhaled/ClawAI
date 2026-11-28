import {
  RESEARCH_SOURCE_EXCERPT_MAX_CHARS,
  RESEARCH_SOURCE_READ_STATUS,
  RESEARCH_SOURCE_THIN_STATUS,
} from '../../../common/constants/research-engine.constants';
import { ResearchSourceDiscovery } from '../../../common/enums/research-source-discovery.enum';
import { ResearchWorkflowKind } from '../../../common/enums/research-workflow-kind.enum';
import { contentHashOf } from '../../../common/utilities/content-hash.utility';
import { hostLaneKey } from './fetch-batch.utility';
import { canonicalUrlKey } from './fetch-targets.utility';
import type { Prisma } from '../../../generated/prisma';
import type { EvidenceItem } from '../types/evidence-bundle.types';
import type { PersistSourcesInput } from '../types/research-engine.types';

/** One `research_sources` row per bundle item; excerpt capped, hash always set. */
export function toResearchSourceRows(
  input: PersistSourcesInput,
): Prisma.ResearchSourceCreateManyInput[] {
  return input.items.map((item) => ({
    runId: input.runId,
    userId: input.userId,
    threadId: input.threadId,
    url: item.url,
    canonicalKey: canonicalUrlKey(item.url),
    host: hostLaneKey(item.url),
    title: item.title,
    excerpt: item.snippet.slice(0, RESEARCH_SOURCE_EXCERPT_MAX_CHARS),
    contentHash: item.contentHash ?? contentHashOf(item.snippet),
    language: null,
    query: item.query ?? null,
    round: input.round,
    discoveredVia: discoveryOf(item, input),
    providerKind: item.providerKind,
    fetchStatus: persistedFetchStatus(item),
    publishedAt: toDateOrNull(item.publishedAt),
    // A reused item keeps its original read time, so a page never counts as
    // fresh in thread memory for longer than one window after it was read.
    retrievedAt: toDateOrNull(item.fetchedAt) ?? input.now,
    score: item.confidence,
  }));
}

/** How the item reached the run. */
export function discoveryOf(
  item: EvidenceItem,
  context: Pick<PersistSourcesInput, 'workflow' | 'directKeys'>,
): ResearchSourceDiscovery {
  if (item.reusedFromRunId !== undefined) {
    return ResearchSourceDiscovery.THREAD_MEMORY;
  }
  if (context.workflow === ResearchWorkflowKind.SITE_CRAWL) {
    return ResearchSourceDiscovery.CRAWL;
  }
  if (item.source !== 'search' && context.directKeys.has(canonicalUrlKey(item.url))) {
    return ResearchSourceDiscovery.DIRECT;
  }
  return ResearchSourceDiscovery.SEARCH;
}

/**
 * 'OK' only for a page that was actually read. A search hit stores null (its
 * page, when opened, is its own item); a thin shell stores 'THIN', so thread
 * memory never serves it as read.
 */
export function persistedFetchStatus(item: EvidenceItem): string | null {
  if (item.source === 'search') {
    return null;
  }
  if (item.fetch?.thin === true) {
    return RESEARCH_SOURCE_THIN_STATUS;
  }
  return item.fetchStatus ?? RESEARCH_SOURCE_READ_STATUS;
}

/** An ISO string as a Date; null when absent or unparsable. */
export function toDateOrNull(value: string | null): Date | null {
  if (value === null) {
    return null;
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}
