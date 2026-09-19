import { NarrationKind } from '@/enums/narration-kind.enum';
import type { TranslateFunction } from '@/types/i18n.types';
import type { NarrationEntry } from '@/types/narration.types';

const KINDS = new Set<string>(Object.values(NarrationKind));

/** Kinds where the AI is speaking in its own words, rendered as the AI. */
export function isAiVoice(entry: NarrationEntry): boolean {
  return (
    (entry.kind === NarrationKind.PLANNED ||
      entry.kind === NarrationKind.REPLANNED ||
      entry.kind === NarrationKind.AI_THOUGHT) &&
    typeof entry.text === 'string' &&
    entry.text.length > 0
  );
}

/**
 * One log line as the reader sees it, in their language.
 *
 * The planner's own sentence is shown verbatim; every other line is built from
 * its kind and params, so "Done crawling: 14 pages read" reads correctly in all
 * thirteen locales. A count here is always what was READ, never what was found
 * (rule 41).
 */
export function describeNarrationEntry(entry: NarrationEntry, t: TranslateFunction): string {
  const params = entry.params ?? {};
  switch (entry.kind) {
    case NarrationKind.PLANNED:
    case NarrationKind.REPLANNED:
    case NarrationKind.AI_THOUGHT:
      return entry.text ?? '';
    case NarrationKind.CRAWL_STARTED:
      return t('narration.crawlStarted', { urls: String(params['urls'] ?? '') });
    case NarrationKind.CRAWL_PROGRESS:
      return describeCrawlProgress(params, t);
    case NarrationKind.CRAWL_DONE:
      return t('narration.crawlDone', { count: Number(params['count'] ?? 0) });
    case NarrationKind.BACK_TO_AI:
      return t('narration.backToAi');
    case NarrationKind.SEARCH_STARTED: {
      const query = String(params['query'] ?? '');
      return query.length > 0
        ? t('narration.searchStartedWithQuery', { query })
        : t('narration.searchStarted');
    }
    case NarrationKind.SEARCH_DONE:
      return t('narration.searchDone', { count: Number(params['count'] ?? 0) });
    case NarrationKind.RESEARCH_FAILED:
      return t('narration.researchFailed');
    case NarrationKind.AI_THINKING: {
      const model = String(params['model'] ?? '');
      return model.length > 0
        ? t('narration.aiThinkingWithModel', { model })
        : t('narration.aiThinking');
    }
    default:
      return '';
  }
}

function describeCrawlProgress(
  params: Record<string, string | number>,
  t: TranslateFunction,
): string {
  const pagesFetched = Number(params['pagesFetched'] ?? 0);
  const pagesDiscovered = Number(params['pagesDiscovered'] ?? 0);
  switch (params['phase']) {
    case 'robots':
      return t('narration.crawlProgressRobots');
    case 'sitemap':
      return t('narration.crawlProgressSitemap', { pagesDiscovered });
    case 'feed':
      return t('narration.crawlProgressFeed');
    default:
      return t('narration.crawlProgressPage', { pagesFetched, pagesDiscovered });
  }
}

/**
 * The work log stored on an answer, or [] — read defensively, because
 * metadata is untyped JSON and a message stored before this existed has none.
 */
export function getStoredNarration(metadata: unknown): NarrationEntry[] {
  if (typeof metadata !== 'object' || metadata === null) {
    return [];
  }
  const raw = (metadata as Record<string, unknown>)['narration'];
  if (!Array.isArray(raw)) {
    return [];
  }
  return raw.filter(
    (entry): entry is NarrationEntry =>
      typeof entry === 'object' &&
      entry !== null &&
      typeof (entry as NarrationEntry).id === 'string' &&
      KINDS.has((entry as NarrationEntry).kind),
  );
}
