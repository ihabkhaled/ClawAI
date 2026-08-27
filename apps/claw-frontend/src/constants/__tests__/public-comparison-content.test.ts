import { describe, expect, it } from 'vitest';

import { EN_COMPARISON_CONTENT } from '@/constants/public-comparison-content/en.constants';
import { COMPARISON_CONTENT_BY_LOCALE } from '@/constants/public-comparison-content.constants';
import {
  COMPARISON_DIMENSION_ORDER,
  COMPARISON_RIVAL_ORDER,
  COMPARISON_RIVAL_TOKEN,
} from '@/constants/public-comparison.constants';
import { ComparisonRival } from '@/enums/comparison-rival.enum';
import { Locale } from '@/enums/locale.enum';
import { SUPPORTED_LOCALES } from '@/lib/i18n/i18n.constants';

// Comparison pages reach the sitemap for all thirteen locales the moment their
// registry entry is PUBLISHED — the registry has no way to know whether the body
// behind a localized URL is actually in that language. These tests are that
// check: they exist because an English page served at /ja/compare/chatgpt is
// worse for discovery than no page at all, and because the failure is invisible
// in review (it compiles, renders, and looks fine to a reader of English).

const LOCALES = SUPPORTED_LOCALES.map(({ locale }) => locale);

/** Template labels whose translation must keep the rival-name placeholder. */
const PLACEHOLDER_LABELS = ['tableCaption', 'strengthTitle', 'chooseRivalLabel'] as const;

describe('comparison content', () => {
  it('covers every supported locale', () => {
    expect(Object.keys(COMPARISON_CONTENT_BY_LOCALE).sort()).toEqual([...LOCALES].sort());
  });

  it.each(LOCALES)('%s carries every rival and every dimension', (locale) => {
    const content = COMPARISON_CONTENT_BY_LOCALE[locale];
    expect(Object.keys(content.rivals).sort()).toEqual([...COMPARISON_RIVAL_ORDER].sort());
    for (const dimension of COMPARISON_DIMENSION_ORDER) {
      expect(content.dimensionLabels[dimension]).not.toBe('');
      expect(content.clawCells[dimension]).not.toBe('');
      for (const rival of COMPARISON_RIVAL_ORDER) {
        expect(content.rivals[rival].cells[dimension]).not.toBe('');
      }
    }
  });

  it.each(LOCALES)('%s keeps the rival placeholder in every template label', (locale) => {
    const { labels, hub } = COMPARISON_CONTENT_BY_LOCALE[locale];
    for (const key of PLACEHOLDER_LABELS) {
      expect(labels[key]).toContain(COMPARISON_RIVAL_TOKEN);
    }
    expect(hub.cardCta).toContain(COMPARISON_RIVAL_TOKEN);
  });

  it.each(LOCALES)('%s gives every rival three answered questions', (locale) => {
    const content = COMPARISON_CONTENT_BY_LOCALE[locale];
    for (const rival of COMPARISON_RIVAL_ORDER) {
      const { faq } = content.rivals[rival];
      expect(faq).toHaveLength(3);
      for (const entry of faq) {
        expect(entry.question.length).toBeGreaterThan(5);
        expect(entry.answer.length).toBeGreaterThan(20);
      }
    }
  });

  it.each(LOCALES)('%s keeps product names untranslated', (locale) => {
    // "ChatGPT" is "ChatGPT" in Japanese too. A transliterated product name in
    // one locale would break the {rival} substitution against the visible brand
    // and make the page match nothing a reader searched for.
    const content = COMPARISON_CONTENT_BY_LOCALE[locale];
    for (const rival of COMPARISON_RIVAL_ORDER) {
      expect(content.rivals[rival].name).toBe(EN_COMPARISON_CONTENT.rivals[rival].name);
      expect(content.rivals[rival].vendor).toBe(EN_COMPARISON_CONTENT.rivals[rival].vendor);
    }
  });

  it('is actually translated, not English copied into thirteen files', () => {
    // The failure this catches is a real one: adding a locale by duplicating the
    // English file leaves a page that is indexable in a language it is not
    // written in. Prose is compared, not labels — "ClawAI" and product names are
    // identical everywhere by design.
    const english = EN_COMPARISON_CONTENT.rivals[ComparisonRival.CHATGPT].intro;
    for (const locale of LOCALES) {
      if (locale === Locale.EN) {
        continue;
      }
      expect(COMPARISON_CONTENT_BY_LOCALE[locale].rivals[ComparisonRival.CHATGPT].intro).not.toBe(
        english,
      );
      expect(COMPARISON_CONTENT_BY_LOCALE[locale].hub.intro).not.toBe(
        EN_COMPARISON_CONTENT.hub.intro,
      );
    }
  });

  it('names a case for choosing the competitor on every page', () => {
    // A comparison with no honest "pick them instead" is an advertisement. This
    // is the structural half of that promise; the wording is a review question.
    for (const locale of LOCALES) {
      for (const rival of COMPARISON_RIVAL_ORDER) {
        expect(
          COMPARISON_CONTENT_BY_LOCALE[locale].rivals[rival].chooseRival.length,
        ).toBeGreaterThan(20);
      }
    }
  });
});
