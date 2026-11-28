import { FETCH_STRATEGY_KEYS } from '@/constants/research.constants';
import { Locale } from '@/enums/locale.enum';
import { NarrationKind } from '@/enums/narration-kind.enum';
import type { TranslateFunction } from '@/types/i18n.types';
import type { NarrationEntry } from '@/types/narration.types';
import { formatNarratedProviders } from '@/utilities/context-warning.utility';
import {
  describeBackToAi,
  describeReplanned,
  describeSearchCounters,
  describeSearchStarted,
  withNarrationCounters,
} from '@/utilities/narration-counters.utility';

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
 *
 * `locale` picks plural forms and names languages ("Spanisch" for a German
 * reader); research-round counters are added only when chat-service sent them
 * (narration-counters.utility.ts).
 */
export function describeNarrationEntry(
  entry: NarrationEntry,
  t: TranslateFunction,
  locale: string = Locale.EN,
): string {
  const params = entry.params ?? {};
  switch (entry.kind) {
    case NarrationKind.PLANNED:
    case NarrationKind.AI_THOUGHT:
      return entry.text ?? '';
    case NarrationKind.REPLANNED:
      return describeReplanned(entry.text ?? '', params, t, locale);
    case NarrationKind.CRAWL_STARTED:
      return t('narration.crawlStarted', { urls: String(params['urls'] ?? '') });
    case NarrationKind.CRAWL_PROGRESS:
      return describeCrawlProgress(params, t);
    case NarrationKind.CRAWL_DONE:
      return t('narration.crawlDone', { count: Number(params['count'] ?? 0) });
    case NarrationKind.BACK_TO_AI:
      return describeBackToAi(params, t);
    case NarrationKind.SEARCH_STARTED:
      return describeSearchStarted(params, t, locale);
    case NarrationKind.SEARCH_DONE: {
      const count = Number(params['count'] ?? 0);
      // Older chat-service builds omit `providers`; they keep the plain line.
      const providers = formatNarratedProviders(params['providers']);
      const base =
        providers.length > 0
          ? t('narration.searchDoneWithProviders', { providers, count })
          : t('narration.searchDone', { count });
      return withNarrationCounters(base, describeSearchCounters(params, t, locale));
    }
    case NarrationKind.RESEARCH_FAILED:
      return t('narration.researchFailed');
    case NarrationKind.PAGE_READ: {
      const host = String(params['host'] ?? '');
      const strategy = describeFetchStrategy(String(params['strategy'] ?? ''), t);
      const blocked = String(params['blocked'] ?? '');
      return blocked.length > 0
        ? t('narration.pageReadAfter', {
            host,
            strategy,
            blocked: describeFetchStrategy(blocked, t),
          })
        : t('narration.pageRead', { host, strategy });
    }
    case NarrationKind.LONG_INPUT:
      return describeLongInput(params, t);
    case NarrationKind.LONG_OUTPUT:
      return t('narration.longOutputPart', { part: Number(params['part'] ?? 2) });
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

/** "Reading all 12 parts of x.txt", "Read 30 of 120 parts of x.txt", "Read all 12 parts of x.txt" (ADR-231). */
function describeLongInput(params: Record<string, string | number>, t: TranslateFunction): string {
  const name = String(params['name'] ?? '');
  const parts = Number(params['parts'] ?? 0);
  const done = Number(params['done'] ?? 0);
  if (done <= 0) {
    return t('narration.longInputReading', { name, parts });
  }
  return done >= parts
    ? t('narration.longInputDone', { name, parts })
    : t('narration.longInputProgress', { name, parts, done });
}

/** A fetch tier's name in the reader's language; an unknown kind is shown as-is (a newer server). */
export function describeFetchStrategy(kind: string, t: TranslateFunction): string {
  const key = FETCH_STRATEGY_KEYS[kind];
  return key === undefined ? kind : t(key);
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
