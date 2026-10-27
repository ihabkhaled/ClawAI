import { describe, expect, it } from 'vitest';

import { Locale } from '@/enums/locale.enum';
import { en } from '@/lib/i18n/locales/en';
import { THREAD_EVIDENCE_TRANSLATIONS } from '@/lib/i18n/locales/thread-evidence-translations';
import { getTranslation } from '@/lib/i18n/translations';

const PLACEHOLDER = /\{[a-zA-Z]+\}/gu;
const english = THREAD_EVIDENCE_TRANSLATIONS[Locale.EN];
const keys = Object.keys(english);
const locales = Object.values(Locale);

const EXPECTED_PLACEHOLDERS: Record<string, string[]> = {
  threadEvidenceBlockedLead: ['{reviewer}'],
  threadEvidenceLowLead: ['{reviewer}'],
  threadEvidenceScoreLine: ['{min}', '{score}'],
  threadEvidenceStepFound: ['{count}'],
};

function placeholders(text: string): string[] {
  return [...(text.match(PLACEHOLDER) ?? [])].toSorted();
}

describe('THREAD_EVIDENCE_TRANSLATIONS', () => {
  it('has all 13 locales with the same keys, none empty', () => {
    expect(locales).toHaveLength(13);
    for (const locale of locales) {
      const entry: Record<string, string> = THREAD_EVIDENCE_TRANSLATIONS[locale];
      expect(Object.keys(entry).toSorted(), locale).toEqual(keys.toSorted());
      for (const key of keys) {
        expect(entry[key]?.trim(), `${locale}.${key}`).toBeTruthy();
      }
    }
  });

  it.each(locales)('%s keeps the placeholders of the English text', (locale) => {
    const entry: Record<string, string> = THREAD_EVIDENCE_TRANSLATIONS[locale];
    const source: Record<string, string> = english;
    for (const key of keys) {
      expect(placeholders(entry[key] ?? ''), `${locale}.${key}`).toEqual(
        EXPECTED_PLACEHOLDERS[key] ?? [],
      );
      expect(placeholders(source[key] ?? ''), `en.${key}`).toEqual(
        EXPECTED_PLACEHOLDERS[key] ?? [],
      );
    }
  });

  it.each(locales.filter((locale) => locale !== Locale.EN))(
    '%s has its own wording, not the English text',
    (locale) => {
      const entry: Record<string, string> = THREAD_EVIDENCE_TRANSLATIONS[locale];
      const source: Record<string, string> = english;
      const same = keys.filter((key) => entry[key] === source[key]);
      expect(same, locale).toEqual([]);
    },
  );

  it('is part of the chat dictionary in every locale', () => {
    expect(en.chat.threadEvidenceBlockedTitle).toBe('Blocked by an unmet requirement');
    expect(en.chat.threadEvidenceScoreLine).toBe('{score} of 100, needs {min} and no blockers');
    for (const locale of locales) {
      const entry: Record<string, string> = THREAD_EVIDENCE_TRANSLATIONS[locale];
      for (const key of keys) {
        expect(getTranslation(locale, `chat.${key}`), `${locale}.${key}`).toBe(entry[key]);
      }
    }
  });
});
