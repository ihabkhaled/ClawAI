import { describe, expect, it } from 'vitest';

import { MODELS_CONTENT_BY_LOCALE } from '@/constants/models-content.constants';
import { MODEL_PROVIDER_ORDER } from '@/constants/models.constants';
import { Locale } from '@/enums/locale.enum';
import { ModelProviderPage } from '@/enums/model-provider-page.enum';

/**
 * Mirrors `learn-content-locale-completeness.test.ts` for the `/models`
 * cluster: structural parity (keys, section ids, SEO uniqueness, exhaustive
 * order-array coverage) and a substantive-content length floor. Deliberately
 * does NOT mirror learn's "no untranslated English fallback" assertion — this
 * cluster's copy was produced by independent per-locale translation passes,
 * and several provider/product proper nouns (OpenAI, Anthropic, DeepSeek,
 * xAI, ClawAI, Ollama, llama.cpp) plus short technical labels are legitimately
 * identical or near-identical across locales in ways a fixed allowlist cannot
 * safely anticipate without hand-auditing all thirteen files.
 */
function flatten(
  value: unknown,
  prefix = '',
  result: Record<string, string> = {},
): Record<string, string> {
  if (typeof value === 'string') {
    result[prefix] = value;
    return result;
  }
  if (typeof value !== 'object' || value === null) {
    return result;
  }
  for (const [key, child] of Object.entries(value)) {
    flatten(child, prefix === '' ? key : `${prefix}.${key}`, result);
  }
  return result;
}

const english = flatten(MODELS_CONTENT_BY_LOCALE[Locale.EN]);
const nonEnglishLocales = Object.values(Locale).filter((locale) => locale !== Locale.EN);

describe('/models content locale completeness', () => {
  it.each(MODEL_PROVIDER_ORDER)(
    '%s has at least three sections and three FAQs in every locale',
    (provider) => {
      for (const locale of Object.values(Locale)) {
        const content = MODELS_CONTENT_BY_LOCALE[locale].providers[provider];
        expect(content.sections.length, locale).toBeGreaterThanOrEqual(3);
        expect(content.faq.length, locale).toBeGreaterThanOrEqual(3);
      }
    },
  );

  it.each(MODEL_PROVIDER_ORDER)(
    '%s: keeps section ids identical across every locale',
    (provider) => {
      const englishSectionIds = MODELS_CONTENT_BY_LOCALE[Locale.EN].providers[
        provider
      ].sections.map((section) => section.id);

      for (const locale of Object.values(Locale)) {
        const content = MODELS_CONTENT_BY_LOCALE[locale].providers[provider];
        expect(
          content.sections.map((section) => section.id),
          locale,
        ).toEqual(englishSectionIds);
      }
    },
  );

  it.each(MODEL_PROVIDER_ORDER)('%s: gives every locale unique, distinct SEO copy', (provider) => {
    const content = Object.values(Locale).map(
      (locale) => MODELS_CONTENT_BY_LOCALE[locale].providers[provider],
    );

    expect(new Set(content.map((p) => p.seo.title))).toHaveLength(Object.values(Locale).length);
    expect(new Set(content.map((p) => p.seo.description))).toHaveLength(
      Object.values(Locale).length,
    );
    expect(new Set(content.map((p) => p.seo.keywords.join('|')))).toHaveLength(
      Object.values(Locale).length,
    );
  });

  it('keeps the provider order exhaustive', () => {
    expect(MODEL_PROVIDER_ORDER).toContain(ModelProviderPage.OPENAI);
    expect(MODEL_PROVIDER_ORDER).toContain(ModelProviderPage.LOCAL_AI);
  });

  it('lists every ModelProviderPage enum member in MODEL_PROVIDER_ORDER exactly once', () => {
    const enumProviders = Object.values(ModelProviderPage).slice().sort();
    const orderedProviders = [...MODEL_PROVIDER_ORDER].sort();
    expect(orderedProviders).toEqual(enumProviders);
  });

  it.each(nonEnglishLocales)(
    '%s defines every English key with no missing sections/faq/keywords',
    (locale) => {
      const localized = flatten(MODELS_CONTENT_BY_LOCALE[locale]);
      expect(Object.keys(localized).sort()).toEqual(Object.keys(english).sort());
    },
  );

  /**
   * Same measurement-derived floors as `learn-content-locale-completeness.test.ts`
   * (see that file for how they were chosen), applied to this cluster's shorter
   * per-section copy.
   */
  const COMPACT_SCRIPT_LOCALES = new Set<Locale>([Locale.JA, Locale.ZH]);
  const MIN_PARAGRAPH_LENGTH = 60;
  const MIN_PARAGRAPH_LENGTH_COMPACT = 25;
  const MIN_FAQ_ANSWER_LENGTH = 70;
  const MIN_FAQ_ANSWER_LENGTH_COMPACT = 30;

  it.each(Object.values(Locale))(
    '%s: every provider clears the substantive paragraph and FAQ-answer length floor',
    (locale) => {
      const minParagraph = COMPACT_SCRIPT_LOCALES.has(locale)
        ? MIN_PARAGRAPH_LENGTH_COMPACT
        : MIN_PARAGRAPH_LENGTH;
      const minFaqAnswer = COMPACT_SCRIPT_LOCALES.has(locale)
        ? MIN_FAQ_ANSWER_LENGTH_COMPACT
        : MIN_FAQ_ANSWER_LENGTH;

      for (const provider of MODEL_PROVIDER_ORDER) {
        const content = MODELS_CONTENT_BY_LOCALE[locale].providers[provider];
        for (const section of content.sections) {
          for (const paragraph of section.paragraphs) {
            expect(paragraph.length, `${provider}/${section.id}`).toBeGreaterThanOrEqual(
              minParagraph,
            );
          }
        }
        for (const entry of content.faq) {
          expect(entry.answer.length, `${provider}: ${entry.question}`).toBeGreaterThanOrEqual(
            minFaqAnswer,
          );
        }
      }
    },
  );

  // Replaces a per-provider "catalogDisclaimer" check. That copy said the list
  // was "priced as of the review date, not a live feed" — true while the list
  // was a dated constant, false the moment it became a catalog read. One
  // shared, accurate note replaced 78 strings that had all become wrong.
  it.each(Object.values(Locale))(
    '%s: carries the live-catalog note and the unavailable note',
    (locale) => {
      const { labels } = MODELS_CONTENT_BY_LOCALE[locale];
      const english = MODELS_CONTENT_BY_LOCALE[Locale.EN].labels;

      // Non-empty, and — for every locale but English — actually different from
      // English, which catches a copy-paste far better than a length check
      // would. A character minimum is a Latin-centric test: the Chinese note
      // says the same thing in a third of the characters.
      expect(labels.catalogLiveNote.trim().length, locale).toBeGreaterThan(0);
      expect(labels.catalogUnavailable.trim().length, locale).toBeGreaterThan(0);
      if (locale !== Locale.EN) {
        expect(labels.catalogLiveNote, locale).not.toBe(english.catalogLiveNote);
        expect(labels.catalogUnavailable, locale).not.toBe(english.catalogUnavailable);
      }
      expect(labels.catalogMore, locale).toContain('{count}');
      for (const label of Object.values(labels.capabilityLabels)) {
        expect(label.length, locale).toBeGreaterThan(0);
      }
    },
  );
});
