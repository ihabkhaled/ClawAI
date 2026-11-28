import { describe, expect, it } from 'vitest';

import { Locale } from '@/enums/locale.enum';
import { NarrationKind } from '@/enums/narration-kind.enum';
import { getTranslation } from '@/lib/i18n/translations';
import type { NarrationEntry, NarrationParams } from '@/types/narration.types';
import { narrationCount } from '@/utilities/narration-counters.utility';
import { describeNarrationEntry } from '@/utilities/narration.utility';

const translator =
  (locale: Locale) =>
  (key: string, params?: Record<string, string | number>): string =>
    getTranslation(locale, key, params);

const en = translator(Locale.EN);

const entry = (kind: NarrationKind, params?: NarrationParams, text?: string): NarrationEntry => ({
  id: `${kind}-1`,
  kind,
  at: '2026-11-27T10:00:00.000Z',
  params,
  text,
});

const line = (
  kind: NarrationKind,
  params?: NarrationParams,
  locale: Locale = Locale.EN,
  text?: string,
): string => describeNarrationEntry(entry(kind, params, text), translator(locale), locale);

describe('narration counters: an older server (no counters) reads exactly as before', () => {
  it('keeps BACK_TO_AI, SEARCH_STARTED and SEARCH_DONE unchanged without the new params', () => {
    expect(line(NarrationKind.BACK_TO_AI)).toBe(en('narration.backToAi'));
    expect(line(NarrationKind.SEARCH_STARTED)).toBe(en('narration.searchStarted'));
    expect(line(NarrationKind.SEARCH_STARTED, { query: 'llama prices' })).toBe(
      en('narration.searchStartedWithQuery', { query: 'llama prices' }),
    );
    expect(line(NarrationKind.SEARCH_DONE, { count: 4 })).toBe(
      en('narration.searchDone', { count: 4 }),
    );
    expect(line(NarrationKind.SEARCH_DONE, { count: 4, providers: 'Brave', warnings: 0 })).toBe(
      en('narration.searchDoneWithProviders', { providers: 'Brave', count: 4 }),
    );
  });

  it("keeps the planner's REPLANNED sentence verbatim without counters", () => {
    expect(line(NarrationKind.REPLANNED, undefined, Locale.EN, 'I still need prices.')).toBe(
      'I still need prices.',
    );
    expect(line(NarrationKind.REPLANNED)).toBe('');
  });

  it('treats round 1 as the first round, not a follow-up', () => {
    expect(line(NarrationKind.BACK_TO_AI, { round: 1 })).toBe(en('narration.backToAi'));
    expect(line(NarrationKind.SEARCH_STARTED, { round: 1, queries: 1, query: 'x' })).toBe(
      en('narration.searchStartedWithQuery', { query: 'x' }),
    );
  });

  it('defaults to English plural rules when no locale is passed', () => {
    expect(
      describeNarrationEntry(entry(NarrationKind.SEARCH_DONE, { count: 2, queries: 3 }), en),
    ).toBe('Fetched results: 2 source(s) read · 3 queries');
  });
});

describe('narration counters: BACK_TO_AI and REPLANNED', () => {
  it('names the round the AI is planning', () => {
    expect(line(NarrationKind.BACK_TO_AI, { round: 2 })).toBe('Back to the AI to plan round 2');
  });

  it("adds the round and the new queries after the planner's sentence", () => {
    expect(
      line(NarrationKind.REPLANNED, { round: 2, queries: 2 }, Locale.EN, 'I still need prices.'),
    ).toBe('I still need prices. · Round 2 · 2 new queries');
    expect(
      line(NarrationKind.REPLANNED, { round: 3, queries: 1 }, Locale.EN, 'One more angle.'),
    ).toBe('One more angle. · Round 3 · 1 new query');
  });

  it('shows the counters alone when the planner wrote no sentence', () => {
    expect(line(NarrationKind.REPLANNED, { round: 2, queries: 2 })).toBe('Round 2 · 2 new queries');
  });

  it('leaves out zero new queries', () => {
    expect(line(NarrationKind.REPLANNED, { round: 2, queries: 0 }, Locale.EN, 'Done.')).toBe(
      'Done. · Round 2',
    );
  });
});

describe('narration counters: SEARCH_STARTED', () => {
  it('says a follow-up round and how many more queries it runs', () => {
    expect(line(NarrationKind.SEARCH_STARTED, { round: 2, queries: 3, query: 'a' })).toBe(
      'Round 2: researching 3 more queries',
    );
    expect(line(NarrationKind.SEARCH_STARTED, { round: 2, queries: 1, query: 'a' })).toBe(
      'Round 2: researching 1 more query',
    );
  });

  it('names the languages of a follow-up round in the reader language', () => {
    expect(
      line(NarrationKind.SEARCH_STARTED, { round: 2, queries: 3, languages: 'en, es', query: 'a' }),
    ).toBe('Round 2: researching 3 more queries in English and Spanish');
  });

  it('counts several queries in the first round, with or without languages', () => {
    expect(line(NarrationKind.SEARCH_STARTED, { queries: 4, query: 'a' })).toBe(
      'Researching 4 queries',
    );
    expect(line(NarrationKind.SEARCH_STARTED, { queries: 4, languages: 'en,es', query: 'a' })).toBe(
      'Researching 4 queries in English and Spanish',
    );
  });

  it('names a single foreign language on the plain line', () => {
    expect(line(NarrationKind.SEARCH_STARTED, { queries: 1, languages: 'es', query: 'x' })).toBe(
      'Researching the web for “x” in Spanish',
    );
    expect(line(NarrationKind.SEARCH_STARTED, { languages: 'es' })).toBe(
      'Researching the web in Spanish',
    );
  });

  it("does not name the reader's own language when it is the only one", () => {
    expect(line(NarrationKind.SEARCH_STARTED, { queries: 1, languages: 'en', query: 'x' })).toBe(
      en('narration.searchStartedWithQuery', { query: 'x' }),
    );
    expect(
      line(NarrationKind.SEARCH_STARTED, { queries: 1, languages: 'de', query: 'x' }, Locale.DE),
    ).toBe(getTranslation(Locale.DE, 'narration.searchStartedWithQuery', { query: 'x' }));
  });

  it('shows a language code it cannot name as received', () => {
    expect(line(NarrationKind.SEARCH_STARTED, { languages: 'not a code!' })).toBe(
      'Researching the web in not a code!',
    );
  });
});

describe('narration counters: SEARCH_DONE', () => {
  it('appends every present counter after the base line', () => {
    expect(
      line(NarrationKind.SEARCH_DONE, {
        count: 6,
        providers: 'Brave',
        providerCount: 1,
        warnings: 0,
        round: 2,
        queries: 4,
        languages: 'en, es',
        duplicatesRemoved: 3,
        reusedFromThread: 5,
        platforms: 'reddit, arxiv',
      }),
    ).toBe(
      'Searched with Brave: 6 source(s) read · 4 queries · 2 languages · 3 duplicates removed · ' +
        '5 sources reused from earlier in this chat · Platforms: Reddit and arXiv',
    );
  });

  it('uses the singular forms for one', () => {
    expect(
      line(NarrationKind.SEARCH_DONE, { count: 2, duplicatesRemoved: 1, reusedFromThread: 1 }),
    ).toBe(
      'Fetched results: 2 source(s) read · 1 duplicate removed · 1 source reused from earlier in this chat',
    );
  });

  it('leaves out counters that say nothing: one query, one language, zeros', () => {
    expect(
      line(NarrationKind.SEARCH_DONE, {
        count: 2,
        queries: 1,
        languages: 'en',
        duplicatesRemoved: 0,
        reusedFromThread: 0,
        platforms: '',
      }),
    ).toBe(en('narration.searchDone', { count: 2 }));
  });

  it('ignores a counter that is not a whole, non-negative number', () => {
    expect(
      line(NarrationKind.SEARCH_DONE, {
        count: 2,
        queries: 'many',
        duplicatesRemoved: -2,
        reusedFromThread: 2.5,
      }),
    ).toBe(en('narration.searchDone', { count: 2 }));
  });

  it('accepts a count sent as a numeric string', () => {
    expect(line(NarrationKind.SEARCH_DONE, { count: 2, duplicatesRemoved: '3' })).toBe(
      'Fetched results: 2 source(s) read · 3 duplicates removed',
    );
  });

  it('title-cases a platform slug it has no brand name for', () => {
    expect(line(NarrationKind.SEARCH_DONE, { count: 1, platforms: 'some-forum' })).toBe(
      'Fetched results: 1 source(s) read · Platforms: Some Forum',
    );
  });
});

describe('narration counters in other languages', () => {
  it('names languages and picks plural forms in German', () => {
    expect(
      line(
        NarrationKind.SEARCH_STARTED,
        { queries: 4, languages: 'en, es', query: 'a' },
        Locale.DE,
      ),
    ).toBe('Recherchiere 4 Suchanfragen auf Englisch und Spanisch');
  });

  it('uses the Arabic dual and the Russian few/many forms', () => {
    expect(
      line(NarrationKind.SEARCH_DONE, { count: 3, duplicatesRemoved: 2 }, Locale.AR),
    ).toContain('أُزيل 2 تكراران');
    expect(
      line(NarrationKind.SEARCH_DONE, { count: 3, duplicatesRemoved: 2 }, Locale.RU),
    ).toContain('удалено 2 дубликата');
    expect(
      line(NarrationKind.SEARCH_DONE, { count: 3, duplicatesRemoved: 5 }, Locale.RU),
    ).toContain('удалено 5 дубликатов');
  });

  it.each(Object.values(Locale))(
    '%s renders every counter line with no raw key or placeholder',
    (locale) => {
      const lines = [
        line(NarrationKind.BACK_TO_AI, { round: 2 }, locale),
        line(NarrationKind.REPLANNED, { round: 2, queries: 3 }, locale, 'x'),
        line(NarrationKind.SEARCH_STARTED, { round: 2, queries: 3, languages: 'fr, es' }, locale),
        line(NarrationKind.SEARCH_STARTED, { round: 2, queries: 3 }, locale),
        line(NarrationKind.SEARCH_STARTED, { queries: 4, languages: 'fr, es' }, locale),
        line(NarrationKind.SEARCH_STARTED, { queries: 4 }, locale),
        line(NarrationKind.SEARCH_STARTED, { query: 'q', languages: 'sw' }, locale),
        line(NarrationKind.SEARCH_STARTED, { languages: 'sw' }, locale),
        line(
          NarrationKind.SEARCH_DONE,
          {
            count: 6,
            queries: 4,
            languages: 'fr, es',
            duplicatesRemoved: 3,
            reusedFromThread: 5,
            platforms: 'reddit',
          },
          locale,
        ),
      ];
      for (const text of lines) {
        expect(text).not.toMatch(/[{}]/u);
        expect(text).not.toContain('narration.');
        expect(text.length).toBeGreaterThan(0);
      }
      if (locale !== Locale.EN) {
        expect(lines[0]).not.toBe(line(NarrationKind.BACK_TO_AI, { round: 2 }));
      }
    },
  );
});

describe('narrationCount', () => {
  it('reads whole non-negative numbers and numeric strings only', () => {
    expect(narrationCount(3)).toBe(3);
    expect(narrationCount('7')).toBe(7);
    expect(narrationCount(0)).toBe(0);
    expect(narrationCount(-1)).toBeNull();
    expect(narrationCount(1.5)).toBeNull();
    expect(narrationCount('')).toBeNull();
    expect(narrationCount(undefined)).toBeNull();
    expect(narrationCount('three')).toBeNull();
  });
});
