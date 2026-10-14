import { describe, expect, it } from 'vitest';

import { Locale } from '@/enums/locale.enum';
import { THREAD_BOARD_TRANSLATIONS } from '@/lib/i18n/locales/thread-board-translations';
import { getTranslation } from '@/lib/i18n/translations';

const PLACEHOLDER = /\{[a-zA-Z]+\}/g;
const english = THREAD_BOARD_TRANSLATIONS[Locale.EN];
const keys = Object.keys(english);
const locales = Object.values(Locale);

const EXPECTED_PLACEHOLDERS: Record<string, string[]> = {
  threadBoardDidYouMean: ['{term}'],
  threadBoardResultsCount: ['{count}'],
  threadBoardEmptySearch: ['{query}'],
  threadBoardReadingMinutes: ['{minutes}'],
  threadBoardSources: ['{count}'],
  threadBoardComments: ['{count}'],
  threadBoardLikes: ['{count}'],
  threadBoardViews: ['{count}'],
  threadBoardRateLimitWait: ['{seconds}'],
  threadBoardPageOf: ['{page}', '{total}'],
};

const GUEST_KEYS = keys.filter((key) => key.startsWith('threadBoardGuest'));

describe('THREAD_BOARD_TRANSLATIONS', () => {
  it('has the 15 guest keys of the public, read-only Board', () => {
    expect(GUEST_KEYS).toHaveLength(15);
    expect(GUEST_KEYS).toContain('threadBoardGuestNavLabel');
    expect(GUEST_KEYS).toContain('threadBoardGuestSignInToRequestChange');
  });

  it.each(locales)('%s guest copy has no placeholders and names the sign-in actions', (locale) => {
    const entry: Record<string, string> = THREAD_BOARD_TRANSLATIONS[locale];
    for (const key of GUEST_KEYS) {
      expect(entry[key] ?? '', `${locale}.${key}`).not.toMatch(PLACEHOLDER);
    }
    expect(entry['threadBoardGuestSignInToLike']).not.toBe(
      entry['threadBoardGuestSignInToComment'],
    );
    expect(entry['threadBoardGuestSignInToReport']).not.toBe(
      entry['threadBoardGuestSignInToRequestChange'],
    );
  });

  it('has the 60 keys, all prefixed threadBoard', () => {
    expect(keys).toHaveLength(60);
    for (const key of keys) {
      expect(key.startsWith('threadBoard')).toBe(true);
    }
  });

  it('covers all 13 locales', () => {
    expect(Object.keys(THREAD_BOARD_TRANSLATIONS).sort()).toEqual([...locales].sort());
  });

  it.each(locales)('%s has every key, non-empty, with the English placeholders', (locale) => {
    const entry: Record<string, string> = THREAD_BOARD_TRANSLATIONS[locale];
    expect(Object.keys(entry).sort()).toEqual([...keys].sort());
    for (const key of keys) {
      const text = entry[key] ?? '';
      expect(text.trim().length, `${locale}.${key}`).toBeGreaterThan(0);
      const wanted = EXPECTED_PLACEHOLDERS[key] ?? [];
      expect((text.match(PLACEHOLDER) ?? []).sort(), `${locale}.${key}`).toEqual(
        [...wanted].sort(),
      );
    }
  });

  it.each(locales.filter((locale) => locale !== Locale.EN))(
    '%s is translated, not an English copy',
    (locale) => {
      const entry: Record<string, string> = THREAD_BOARD_TRANSLATIONS[locale];
      const same = keys.filter((key) => entry[key] === (english as Record<string, string>)[key]);
      // Proper nouns such as "Board" may legitimately match (de).
      expect(same.length).toBeLessThanOrEqual(3);
    },
  );

  it.each(locales)('%s is wired into chat.* so t() resolves it', (locale) => {
    const entry: Record<string, string> = THREAD_BOARD_TRANSLATIONS[locale];
    for (const key of keys) {
      expect(getTranslation(locale, `chat.${key}`), `${locale}.chat.${key}`).toBe(entry[key]);
    }
  });
});
