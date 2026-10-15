import { describe, expect, it } from 'vitest';

import { Locale } from '@/enums/locale.enum';
import { THREAD_ARTICLE_TRANSLATIONS } from '@/lib/i18n/locales/thread-article-translations';

const LOCALES = Object.values(Locale);
const english = THREAD_ARTICLE_TRANSLATIONS[Locale.EN];

describe('threadArticle translations', () => {
  it('has every key, filled, in all 13 locales', () => {
    expect(LOCALES).toHaveLength(13);
    for (const locale of LOCALES) {
      const entry = THREAD_ARTICLE_TRANSLATIONS[locale];
      expect(Object.keys(entry).sort()).toEqual(Object.keys(english).sort());
      for (const value of Object.values(entry)) {
        expect(value.trim().length).toBeGreaterThan(0);
      }
    }
  });

  it('keeps the {minutes} and {count} placeholders in every locale', () => {
    for (const locale of LOCALES) {
      const entry = THREAD_ARTICLE_TRANSLATIONS[locale];
      expect(entry.readingTime).toContain('{minutes}');
      expect(entry.formatRemaining).toContain('{count}');
    }
  });

  it('translates the long sentences (no locale copies the English text)', () => {
    for (const locale of LOCALES.filter((value) => value !== Locale.EN)) {
      const entry = THREAD_ARTICLE_TRANSLATIONS[locale];
      expect(entry.formatIntro).not.toBe(english.formatIntro);
      expect(entry.formatSkipped).not.toBe(english.formatSkipped);
      expect(entry.toc).not.toBe(english.toc);
    }
  });
});
