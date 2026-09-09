import { describe, expect, it } from 'vitest';

import { FEATURES_CLUSTER_CONTENT_BY_LOCALE } from '@/constants/features-cluster-content.constants';
import { FEATURES_CAPABILITY_ORDER } from '@/constants/features-cluster.constants';
import { FeatureCapability } from '@/enums/feature-capability.enum';
import { Locale } from '@/enums/locale.enum';

/**
 * Mirrors `use-cases-cluster-content-locale-completeness.test.ts` for the
 * `/features` cluster: structural parity (keys, section ids, SEO
 * uniqueness, exhaustive order-array coverage) and a substantive-content
 * length floor. Also checks the content rules specific to this cluster: no
 * superlative, no fabricated compliance certification, no fabricated
 * benchmark number.
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

const english = flatten(FEATURES_CLUSTER_CONTENT_BY_LOCALE[Locale.EN]);
const nonEnglishLocales = Object.values(Locale).filter((locale) => locale !== Locale.EN);

describe('/features cluster content locale completeness', () => {
  it.each(FEATURES_CAPABILITY_ORDER)(
    '%s has at least three sections and three FAQs in every locale',
    (capability) => {
      for (const locale of Object.values(Locale)) {
        const content = FEATURES_CLUSTER_CONTENT_BY_LOCALE[locale].capabilities[capability];
        expect(content.sections.length, locale).toBeGreaterThanOrEqual(3);
        expect(content.faq.length, locale).toBeGreaterThanOrEqual(3);
      }
    },
  );

  it.each(FEATURES_CAPABILITY_ORDER)(
    '%s: keeps section ids identical across every locale',
    (capability) => {
      const englishSectionIds = FEATURES_CLUSTER_CONTENT_BY_LOCALE[Locale.EN].capabilities[
        capability
      ].sections.map((section) => section.id);

      for (const locale of Object.values(Locale)) {
        const content = FEATURES_CLUSTER_CONTENT_BY_LOCALE[locale].capabilities[capability];
        expect(
          content.sections.map((section) => section.id),
          locale,
        ).toEqual(englishSectionIds);
      }
    },
  );

  it.each(FEATURES_CAPABILITY_ORDER)(
    '%s: gives every locale unique, distinct SEO copy',
    (capability) => {
      const content = Object.values(Locale).map(
        (locale) => FEATURES_CLUSTER_CONTENT_BY_LOCALE[locale].capabilities[capability],
      );

      expect(new Set(content.map((p) => p.seo.title))).toHaveLength(Object.values(Locale).length);
      expect(new Set(content.map((p) => p.seo.description))).toHaveLength(
        Object.values(Locale).length,
      );
      expect(new Set(content.map((p) => p.seo.keywords.join('|')))).toHaveLength(
        Object.values(Locale).length,
      );
    },
  );

  it('keeps the capability order exhaustive', () => {
    expect(FEATURES_CAPABILITY_ORDER).toContain(FeatureCapability.MODEL_ROUTING_AND_ORCHESTRATION);
    expect(FEATURES_CAPABILITY_ORDER).toContain(FeatureCapability.SECURITY_AND_DATA_HANDLING);
  });

  it('lists every FeatureCapability enum member in FEATURES_CAPABILITY_ORDER exactly once', () => {
    const enumCapabilities = Object.values(FeatureCapability).slice().sort();
    const orderedCapabilities = [...FEATURES_CAPABILITY_ORDER].sort();
    expect(orderedCapabilities).toEqual(enumCapabilities);
  });

  it.each(nonEnglishLocales)(
    '%s defines every English key with no missing sections/faq/keywords',
    (locale) => {
      const localized = flatten(FEATURES_CLUSTER_CONTENT_BY_LOCALE[locale]);
      expect(Object.keys(localized).sort()).toEqual(Object.keys(english).sort());
    },
  );

  /** Same measurement-derived floors as `use-cases-cluster-content-locale-completeness.test.ts`. */
  const COMPACT_SCRIPT_LOCALES = new Set<Locale>([Locale.JA, Locale.ZH]);
  const MIN_PARAGRAPH_LENGTH = 60;
  const MIN_PARAGRAPH_LENGTH_COMPACT = 25;
  const MIN_FAQ_ANSWER_LENGTH = 70;
  const MIN_FAQ_ANSWER_LENGTH_COMPACT = 30;

  it.each(Object.values(Locale))(
    '%s: every capability clears the substantive paragraph and FAQ-answer length floor',
    (locale) => {
      const minParagraph = COMPACT_SCRIPT_LOCALES.has(locale)
        ? MIN_PARAGRAPH_LENGTH_COMPACT
        : MIN_PARAGRAPH_LENGTH;
      const minFaqAnswer = COMPACT_SCRIPT_LOCALES.has(locale)
        ? MIN_FAQ_ANSWER_LENGTH_COMPACT
        : MIN_FAQ_ANSWER_LENGTH;

      for (const capability of FEATURES_CAPABILITY_ORDER) {
        const content = FEATURES_CLUSTER_CONTENT_BY_LOCALE[locale].capabilities[capability];
        for (const section of content.sections) {
          for (const paragraph of section.paragraphs) {
            expect(paragraph.length, `${capability}/${section.id}`).toBeGreaterThanOrEqual(
              minParagraph,
            );
          }
        }
        for (const entry of content.faq) {
          expect(entry.answer.length, `${capability}: ${entry.question}`).toBeGreaterThanOrEqual(
            minFaqAnswer,
          );
        }
      }
    },
  );

  it.each(Object.values(Locale))('%s: every SEO description clears the length floor', (locale) => {
    for (const capability of FEATURES_CAPABILITY_ORDER) {
      const content = FEATURES_CLUSTER_CONTENT_BY_LOCALE[locale].capabilities[capability];
      expect(content.seo.description.length, capability).toBeGreaterThan(80);
    }
  });

  const COMPLIANCE_TERMS = /\b(soc\s?2|iso\s?27001|hipaa|fedramp|gdpr certifi\w*)\b/iu;
  // "best-of-N" is the standard technical term for the sampling strategy
  // (generate N candidates, pick the strongest) — not a superlative claim
  // about ClawAI or a third party, so it is excluded via a negative
  // lookahead rather than removing "best" from the pattern entirely.
  const SUPERLATIVE_TERMS = /\bbest(?!-of-n)\b|\b(fastest|#1|number one|leading|world-?class)\b/iu;

  it.each(Object.values(Locale))(
    '%s: no capability claims a compliance certification or an unsubstantiated superlative',
    (locale) => {
      for (const capability of FEATURES_CAPABILITY_ORDER) {
        const content = FEATURES_CLUSTER_CONTENT_BY_LOCALE[locale].capabilities[capability];
        const flattened = flatten(content);
        for (const value of Object.values(flattened)) {
          expect(value, `${locale}/${capability}`).not.toMatch(COMPLIANCE_TERMS);
          if (locale === Locale.EN) {
            expect(value, `${locale}/${capability}`).not.toMatch(SUPERLATIVE_TERMS);
          }
        }
      }
    },
  );
});
