import { describe, expect, it } from 'vitest';

import { COMPARE_MODELS_CONTENT_BY_LOCALE } from '@/constants/compare-models-content.constants';
import { MODEL_FAMILY_PAIR_ORDER } from '@/constants/compare-models.constants';
import { Locale } from '@/enums/locale.enum';
import { ModelFamilyPair } from '@/enums/model-family-pair.enum';

/**
 * Mirrors `model-fit-content-locale-completeness.test.ts` for the
 * `/compare/models` cluster: structural parity (keys, section ids, SEO
 * uniqueness, exhaustive order-array coverage), a substantive-content length
 * floor, and — specific to this cluster — a check that no locale's
 * translation implies a winner between the two named families.
 * Deliberately does NOT assert "no untranslated English fallback" — this
 * cluster's copy was produced by independent per-locale translation passes,
 * and several product proper nouns and routing-mode names (ClawAI, OpenAI,
 * Anthropic, Google, DeepSeek, xAI, Ollama, llama.cpp, Auto, Manual Model,
 * High Reasoning, Cost Saver, Local-Only, Privacy-First) are legitimately
 * identical across locales.
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

const english = flatten(COMPARE_MODELS_CONTENT_BY_LOCALE[Locale.EN]);
const nonEnglishLocales = Object.values(Locale).filter((locale) => locale !== Locale.EN);

describe('/compare/models content locale completeness', () => {
  it.each(MODEL_FAMILY_PAIR_ORDER)(
    '%s has at least three sections and three FAQs in every locale',
    (pair) => {
      for (const locale of Object.values(Locale)) {
        const content = COMPARE_MODELS_CONTENT_BY_LOCALE[locale].pairs[pair];
        expect(content.sections.length, locale).toBeGreaterThanOrEqual(3);
        expect(content.faq.length, locale).toBeGreaterThanOrEqual(3);
      }
    },
  );

  it.each(MODEL_FAMILY_PAIR_ORDER)(
    '%s: keeps section ids identical across every locale',
    (pair) => {
      const englishSectionIds = COMPARE_MODELS_CONTENT_BY_LOCALE[Locale.EN].pairs[
        pair
      ].sections.map((section) => section.id);

      for (const locale of Object.values(Locale)) {
        const content = COMPARE_MODELS_CONTENT_BY_LOCALE[locale].pairs[pair];
        expect(
          content.sections.map((section) => section.id),
          locale,
        ).toEqual(englishSectionIds);
      }
    },
  );

  it.each(MODEL_FAMILY_PAIR_ORDER)('%s: gives every locale unique, distinct SEO copy', (pair) => {
    const content = Object.values(Locale).map(
      (locale) => COMPARE_MODELS_CONTENT_BY_LOCALE[locale].pairs[pair],
    );

    expect(new Set(content.map((p) => p.seo.title))).toHaveLength(Object.values(Locale).length);
    expect(new Set(content.map((p) => p.seo.description))).toHaveLength(
      Object.values(Locale).length,
    );
    expect(new Set(content.map((p) => p.seo.keywords.join('|')))).toHaveLength(
      Object.values(Locale).length,
    );
  });

  it('keeps the pair order exhaustive', () => {
    expect(MODEL_FAMILY_PAIR_ORDER).toContain(ModelFamilyPair.OPENAI_VS_ANTHROPIC);
    expect(MODEL_FAMILY_PAIR_ORDER).toContain(ModelFamilyPair.CLOUD_VS_LOCAL);
  });

  it('lists every ModelFamilyPair enum member in MODEL_FAMILY_PAIR_ORDER exactly once', () => {
    const enumPairs = Object.values(ModelFamilyPair).slice().sort();
    const orderedPairs = [...MODEL_FAMILY_PAIR_ORDER].sort();
    expect(orderedPairs).toEqual(enumPairs);
  });

  it.each(nonEnglishLocales)(
    '%s defines every English key with no missing sections/faq/keywords',
    (locale) => {
      const localized = flatten(COMPARE_MODELS_CONTENT_BY_LOCALE[locale]);
      expect(Object.keys(localized).sort()).toEqual(Object.keys(english).sort());
    },
  );

  /**
   * Same measurement-derived floors as `model-fit-content-locale-completeness.test.ts`.
   */
  const COMPACT_SCRIPT_LOCALES = new Set<Locale>([Locale.JA, Locale.ZH]);
  const MIN_PARAGRAPH_LENGTH = 60;
  const MIN_PARAGRAPH_LENGTH_COMPACT = 25;
  const MIN_FAQ_ANSWER_LENGTH = 70;
  const MIN_FAQ_ANSWER_LENGTH_COMPACT = 30;

  it.each(Object.values(Locale))(
    '%s: every pair clears the substantive paragraph and FAQ-answer length floor',
    (locale) => {
      const minParagraph = COMPACT_SCRIPT_LOCALES.has(locale)
        ? MIN_PARAGRAPH_LENGTH_COMPACT
        : MIN_PARAGRAPH_LENGTH;
      const minFaqAnswer = COMPACT_SCRIPT_LOCALES.has(locale)
        ? MIN_FAQ_ANSWER_LENGTH_COMPACT
        : MIN_FAQ_ANSWER_LENGTH;

      for (const pair of MODEL_FAMILY_PAIR_ORDER) {
        const content = COMPARE_MODELS_CONTENT_BY_LOCALE[locale].pairs[pair];
        for (const section of content.sections) {
          for (const paragraph of section.paragraphs) {
            expect(paragraph.length, `${pair}/${section.id}`).toBeGreaterThanOrEqual(minParagraph);
          }
        }
        for (const entry of content.faq) {
          expect(entry.answer.length, `${pair}: ${entry.question}`).toBeGreaterThanOrEqual(
            minFaqAnswer,
          );
        }
      }
    },
  );

  it.each(Object.values(Locale))(
    '%s: every pair carries a non-empty catalog disclaimer',
    (locale) => {
      for (const pair of MODEL_FAMILY_PAIR_ORDER) {
        const content = COMPARE_MODELS_CONTENT_BY_LOCALE[locale].pairs[pair];
        expect(content.catalogDisclaimer.length, pair).toBeGreaterThan(20);
      }
    },
  );

  it.each(Object.values(Locale))(
    '%s: no pair claims model speed or latency, qualitatively or otherwise',
    (locale) => {
      for (const pair of MODEL_FAMILY_PAIR_ORDER) {
        const content = COMPARE_MODELS_CONTENT_BY_LOCALE[locale].pairs[pair];
        const flattened = flatten(content);
        for (const value of Object.values(flattened)) {
          expect(value.toLowerCase(), `${locale}/${pair}`).not.toMatch(/\blatency\b/u);
        }
      }
    },
  );

  /**
   * The property this whole cluster exists to guarantee (§8.2 of the SEO
   * content architecture doc): no page names a winner. "Best", "better than"
   * and "the best" are unsubstantiated superlatives about named third-party
   * products; this cluster refuses them by construction, in every locale.
   */
  it.each(Object.values(Locale))(
    '%s: no pair declares a winner between the two named families',
    (locale) => {
      for (const pair of MODEL_FAMILY_PAIR_ORDER) {
        const content = COMPARE_MODELS_CONTENT_BY_LOCALE[locale].pairs[pair];
        const flattened = flatten(content);
        for (const [key, value] of Object.entries(flattened)) {
          const lower = value.toLowerCase();
          expect(lower, `${locale}/${pair}/${key}`).not.toMatch(/\bbest\b/u);
          expect(lower, `${locale}/${pair}/${key}`).not.toMatch(/better than/u);
          expect(lower, `${locale}/${pair}/${key}`).not.toMatch(/superior to/u);
          expect(lower, `${locale}/${pair}/${key}`).not.toMatch(/outperforms/u);
        }
      }
    },
  );
});
