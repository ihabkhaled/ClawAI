import {
  NARRATION_COUNT_KEYS,
  NARRATION_COUNTER_SEPARATOR,
  NARRATION_FIRST_FOLLOW_UP_ROUND,
} from '@/constants/narration.constants';
import type { TranslateFunction } from '@/types/i18n.types';
import type { NarrationParams } from '@/types/narration.types';
import { languageDisplayName, primaryLanguageSubtag } from '@/utilities/language-name.utility';
import { formatLocalList, parseCommaList } from '@/utilities/list-format.utility';
import { pluralText } from '@/utilities/plural-text.utility';
import { researchPlatformDisplayName } from '@/utilities/research-platform-name.utility';

/**
 * The research-round counters chat-service adds to a work-log line (B2/B3). Every counter is
 * optional: a line that carries none reads exactly as it did before, and a param that is not a
 * whole, non-negative number is ignored, so a line never shows a number that was not measured
 * (rule 41).
 */

/** A whole, non-negative count from a param, or null when absent or not a count. */
export function narrationCount(value: unknown): number | null {
  let count = Number.NaN;
  if (typeof value === 'number') {
    count = value;
  } else if (typeof value === 'string' && value.trim().length > 0) {
    count = Number(value);
  }
  return Number.isInteger(count) && count >= 0 ? count : null;
}

/** The round number when this line belongs to a follow-up round (2+), else null. */
export function followUpRound(params: NarrationParams): number | null {
  const round = narrationCount(params['round']);
  return round !== null && round >= NARRATION_FIRST_FOLLOW_UP_ROUND ? round : null;
}

/**
 * The languages a step searched, named in the reader's language and joined the way it joins a list
 * ("English and Spanish"). Empty when there is nothing worth saying: no languages, or only the
 * reader's own language.
 */
export function describeSearchedLanguages(value: unknown, locale: string): string {
  const codes = parseCommaList(value);
  const [only] = codes;
  if (only === undefined) {
    return '';
  }
  if (codes.length === 1 && primaryLanguageSubtag(only) === primaryLanguageSubtag(locale)) {
    return '';
  }
  return formatLocalList(
    codes.map((code) => languageDisplayName(code, locale)),
    locale,
  );
}

/** A base line with its counters after it: "Searched with Brave: 6 sources read · 4 queries". */
export function withNarrationCounters(base: string, parts: readonly string[]): string {
  return parts.length === 0 ? base : [base, ...parts].join(NARRATION_COUNTER_SEPARATOR);
}

/** BACK_TO_AI: round 2+ says which round the AI is planning. */
export function describeBackToAi(params: NarrationParams, t: TranslateFunction): string {
  const round = followUpRound(params);
  return round === null ? t('narration.backToAi') : t('narration.backToAiRound', { round });
}

/** SEARCH_STARTED: "Round 2: researching 3 more queries", "Researching 4 queries in English and Spanish". */
export function describeSearchStarted(
  params: NarrationParams,
  t: TranslateFunction,
  locale: string,
): string {
  const query = String(params['query'] ?? '');
  const round = followUpRound(params);
  const queries = narrationCount(params['queries']);
  const languages = describeSearchedLanguages(params['languages'], locale);
  if (round !== null && queries !== null && queries > 0) {
    const phrase = pluralText(t, locale, NARRATION_COUNT_KEYS.moreQueries, queries);
    return languages.length > 0
      ? t('narration.searchStartedRoundInLanguages', { round, queries: phrase, languages })
      : t('narration.searchStartedRound', { round, queries: phrase });
  }
  if (queries !== null && queries > 1) {
    const phrase = pluralText(t, locale, NARRATION_COUNT_KEYS.queries, queries);
    return languages.length > 0
      ? t('narration.searchStartedQueriesInLanguages', { queries: phrase, languages })
      : t('narration.searchStartedQueries', { queries: phrase });
  }
  if (languages.length > 0) {
    return query.length > 0
      ? t('narration.searchStartedWithQueryInLanguages', { query, languages })
      : t('narration.searchStartedInLanguages', { languages });
  }
  return query.length > 0
    ? t('narration.searchStartedWithQuery', { query })
    : t('narration.searchStarted');
}

/**
 * SEARCH_DONE counters, in reading order: queries run (2+), languages (2+), duplicates removed,
 * sources reused from earlier in the chat, and the platforms that returned results.
 */
export function describeSearchCounters(
  params: NarrationParams,
  t: TranslateFunction,
  locale: string,
): string[] {
  const parts: string[] = [];
  const queries = narrationCount(params['queries']);
  if (queries !== null && queries > 1) {
    parts.push(pluralText(t, locale, NARRATION_COUNT_KEYS.queries, queries));
  }
  const languageCount = parseCommaList(params['languages']).length;
  if (languageCount > 1) {
    parts.push(pluralText(t, locale, NARRATION_COUNT_KEYS.languages, languageCount));
  }
  const duplicates = narrationCount(params['duplicatesRemoved']);
  if (duplicates !== null && duplicates > 0) {
    parts.push(pluralText(t, locale, NARRATION_COUNT_KEYS.duplicatesRemoved, duplicates));
  }
  const reused = narrationCount(params['reusedFromThread']);
  if (reused !== null && reused > 0) {
    parts.push(pluralText(t, locale, NARRATION_COUNT_KEYS.reusedFromThread, reused));
  }
  const platforms = parseCommaList(params['platforms']).map(researchPlatformDisplayName);
  if (platforms.length > 0) {
    parts.push(t('narration.platformsLabel', { platforms: formatLocalList(platforms, locale) }));
  }
  return parts;
}

/**
 * REPLANNED: the planner's own sentence, then the round and how many new queries it chose. A line
 * without a sentence (none was written) is the counters alone.
 */
export function describeReplanned(
  text: string,
  params: NarrationParams,
  t: TranslateFunction,
  locale: string,
): string {
  const parts: string[] = [];
  const round = followUpRound(params);
  if (round !== null) {
    parts.push(t('narration.roundLabel', { round }));
  }
  const queries = narrationCount(params['queries']);
  if (queries !== null && queries > 0) {
    parts.push(pluralText(t, locale, NARRATION_COUNT_KEYS.newQueries, queries));
  }
  return text.length === 0
    ? parts.join(NARRATION_COUNTER_SEPARATOR)
    : withNarrationCounters(text, parts);
}
