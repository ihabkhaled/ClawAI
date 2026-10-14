import { describe, expect, it } from 'vitest';

import { THREADS_PUBLIC_BOARD_SEO_BY_LOCALE } from '@/constants/threads-public-board-seo.constants';
import { Locale } from '@/enums/locale.enum';
import { ar } from '@/lib/i18n/locales/ar';
import { de } from '@/lib/i18n/locales/de';
import { en } from '@/lib/i18n/locales/en';
import { es } from '@/lib/i18n/locales/es';
import { fa } from '@/lib/i18n/locales/fa';
import { fr } from '@/lib/i18n/locales/fr';
import { hi } from '@/lib/i18n/locales/hi';
import { it as itLocale } from '@/lib/i18n/locales/it';
import { ja } from '@/lib/i18n/locales/ja';
import { pt } from '@/lib/i18n/locales/pt';
import { ru } from '@/lib/i18n/locales/ru';
import { th } from '@/lib/i18n/locales/th';
import { THREAD_PUBLIC_BOARD_TRANSLATIONS } from '@/lib/i18n/locales/thread-public-board-translations';
import { zh } from '@/lib/i18n/locales/zh';

const DICTIONARIES: Record<Locale, { chat: Record<string, unknown> }> = {
  [Locale.AR]: ar,
  [Locale.DE]: de,
  [Locale.EN]: en,
  [Locale.ES]: es,
  [Locale.FA]: fa,
  [Locale.FR]: fr,
  [Locale.HI]: hi,
  [Locale.IT]: itLocale,
  [Locale.JA]: ja,
  [Locale.PT]: pt,
  [Locale.RU]: ru,
  [Locale.TH]: th,
  [Locale.ZH]: zh,
};
const LOCALES = Object.values(Locale);

describe('public Threads board translations', () => {
  it('covers all 13 locales with non-empty text', () => {
    expect(LOCALES).toHaveLength(13);
    for (const locale of LOCALES) {
      for (const value of Object.values(THREAD_PUBLIC_BOARD_TRANSLATIONS[locale])) {
        expect(value.trim().length).toBeGreaterThan(0);
      }
    }
  });

  it('is spread into the chat namespace of every locale', () => {
    for (const locale of LOCALES) {
      const { chat } = DICTIONARIES[locale];
      const copy = THREAD_PUBLIC_BOARD_TRANSLATIONS[locale];
      expect(chat['threadPublicBoardTitle']).toBe(copy.threadPublicBoardTitle);
      expect(chat['threadPublicBoardIntro']).toBe(copy.threadPublicBoardIntro);
      expect(chat['threadPublicBoardCta']).toBe(copy.threadPublicBoardCta);
    }
  });

  it('translates every non-English locale rather than copying English', () => {
    const english = THREAD_PUBLIC_BOARD_TRANSLATIONS[Locale.EN];
    for (const locale of LOCALES.filter((value) => value !== Locale.EN)) {
      const copy = THREAD_PUBLIC_BOARD_TRANSLATIONS[locale];
      expect(copy.threadPublicBoardIntro).not.toBe(english.threadPublicBoardIntro);
      expect(copy.threadPublicBoardCta).not.toBe(english.threadPublicBoardCta);
      expect(copy.threadPublicBoardSeoTitle).not.toBe(english.threadPublicBoardSeoTitle);
    }
  });

  it('gives every locale real introductory copy, not a thin stub (rule 38)', () => {
    for (const locale of LOCALES) {
      expect(
        THREAD_PUBLIC_BOARD_TRANSLATIONS[locale].threadPublicBoardIntro.length,
      ).toBeGreaterThanOrEqual(120);
    }
  });

  it('keeps the search description at a snippet-friendly length', () => {
    for (const locale of LOCALES) {
      const description = THREAD_PUBLIC_BOARD_TRANSLATIONS[locale].threadPublicBoardSeoDescription;
      expect(description.length).toBeGreaterThanOrEqual(60);
      expect(description.length).toBeLessThanOrEqual(300);
    }
  });

  it('derives the registry SEO copy from the same translations', () => {
    for (const locale of LOCALES) {
      const seo = THREADS_PUBLIC_BOARD_SEO_BY_LOCALE[locale]['threads/board'];
      expect(seo?.title).toBe(THREAD_PUBLIC_BOARD_TRANSLATIONS[locale].threadPublicBoardSeoTitle);
      expect(seo?.description).toBe(
        THREAD_PUBLIC_BOARD_TRANSLATIONS[locale].threadPublicBoardSeoDescription,
      );
      expect(seo?.keywords.length).toBeGreaterThan(0);
    }
  });
});
