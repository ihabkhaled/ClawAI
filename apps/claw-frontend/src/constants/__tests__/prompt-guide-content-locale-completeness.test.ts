import { describe, expect, it } from 'vitest';

import { PROMPT_GUIDE_CONTENT_BY_LOCALE } from '@/constants/prompt-guide-content.constants';
import { PROMPT_GUIDE_TOPIC_ORDER } from '@/constants/prompts.constants';
import { Locale } from '@/enums/locale.enum';
import { PromptGuideTopic } from '@/enums/prompt-guide-topic.enum';

/**
 * Mirrors `model-fit-content-locale-completeness.test.ts` for the `/prompts`
 * cluster: structural parity (keys, section ids, SEO uniqueness, exhaustive
 * order-array coverage) and a substantive-content length floor. Deliberately
 * does NOT assert "no untranslated English fallback" — this cluster's copy
 * was produced by independent per-locale translation passes, and several
 * product proper nouns (ClawAI, Auto, Manual Model, High Reasoning) are
 * legitimately identical across locales.
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

const english = flatten(PROMPT_GUIDE_CONTENT_BY_LOCALE[Locale.EN]);
const nonEnglishLocales = Object.values(Locale).filter((locale) => locale !== Locale.EN);

describe('/prompts content locale completeness', () => {
  it.each(PROMPT_GUIDE_TOPIC_ORDER)(
    '%s has at least three sections and three FAQs in every locale',
    (topic) => {
      for (const locale of Object.values(Locale)) {
        const content = PROMPT_GUIDE_CONTENT_BY_LOCALE[locale].topics[topic];
        expect(content.sections.length, locale).toBeGreaterThanOrEqual(3);
        expect(content.faq.length, locale).toBeGreaterThanOrEqual(3);
      }
    },
  );

  it.each(PROMPT_GUIDE_TOPIC_ORDER)(
    '%s: keeps section ids identical across every locale',
    (topic) => {
      const englishSectionIds = PROMPT_GUIDE_CONTENT_BY_LOCALE[Locale.EN].topics[
        topic
      ].sections.map((section) => section.id);

      for (const locale of Object.values(Locale)) {
        const content = PROMPT_GUIDE_CONTENT_BY_LOCALE[locale].topics[topic];
        expect(
          content.sections.map((section) => section.id),
          locale,
        ).toEqual(englishSectionIds);
      }
    },
  );

  it.each(PROMPT_GUIDE_TOPIC_ORDER)('%s: gives every locale unique, distinct SEO copy', (topic) => {
    const content = Object.values(Locale).map(
      (locale) => PROMPT_GUIDE_CONTENT_BY_LOCALE[locale].topics[topic],
    );

    expect(new Set(content.map((p) => p.seo.title))).toHaveLength(Object.values(Locale).length);
    expect(new Set(content.map((p) => p.seo.description))).toHaveLength(
      Object.values(Locale).length,
    );
    expect(new Set(content.map((p) => p.seo.keywords.join('|')))).toHaveLength(
      Object.values(Locale).length,
    );
  });

  it('keeps the topic order exhaustive', () => {
    expect(PROMPT_GUIDE_TOPIC_ORDER).toContain(PromptGuideTopic.WRITING_CLEAR_PROMPTS);
    expect(PROMPT_GUIDE_TOPIC_ORDER).toContain(PromptGuideTopic.PROMPTING_BY_TASK_TYPE);
  });

  it('lists every PromptGuideTopic enum member in PROMPT_GUIDE_TOPIC_ORDER exactly once', () => {
    const enumTopics = Object.values(PromptGuideTopic).slice().sort();
    const orderedTopics = [...PROMPT_GUIDE_TOPIC_ORDER].sort();
    expect(orderedTopics).toEqual(enumTopics);
  });

  it.each(nonEnglishLocales)(
    '%s defines every English key with no missing sections/faq/keywords',
    (locale) => {
      const localized = flatten(PROMPT_GUIDE_CONTENT_BY_LOCALE[locale]);
      expect(Object.keys(localized).sort()).toEqual(Object.keys(english).sort());
    },
  );

  /** Same measurement-derived floors as `model-fit-content-locale-completeness.test.ts`. */
  const COMPACT_SCRIPT_LOCALES = new Set<Locale>([Locale.JA, Locale.ZH]);
  const MIN_PARAGRAPH_LENGTH = 60;
  const MIN_PARAGRAPH_LENGTH_COMPACT = 25;
  const MIN_FAQ_ANSWER_LENGTH = 70;
  const MIN_FAQ_ANSWER_LENGTH_COMPACT = 30;

  it.each(Object.values(Locale))(
    '%s: every topic clears the substantive paragraph and FAQ-answer length floor',
    (locale) => {
      const minParagraph = COMPACT_SCRIPT_LOCALES.has(locale)
        ? MIN_PARAGRAPH_LENGTH_COMPACT
        : MIN_PARAGRAPH_LENGTH;
      const minFaqAnswer = COMPACT_SCRIPT_LOCALES.has(locale)
        ? MIN_FAQ_ANSWER_LENGTH_COMPACT
        : MIN_FAQ_ANSWER_LENGTH;

      for (const topic of PROMPT_GUIDE_TOPIC_ORDER) {
        const content = PROMPT_GUIDE_CONTENT_BY_LOCALE[locale].topics[topic];
        for (const section of content.sections) {
          for (const paragraph of section.paragraphs) {
            expect(paragraph.length, `${topic}/${section.id}`).toBeGreaterThanOrEqual(minParagraph);
          }
        }
        for (const entry of content.faq) {
          expect(entry.answer.length, `${topic}: ${entry.question}`).toBeGreaterThanOrEqual(
            minFaqAnswer,
          );
        }
      }
    },
  );

  it.each(Object.values(Locale))(
    '%s: no topic overstates what a prompt can guarantee',
    (locale) => {
      for (const topic of PROMPT_GUIDE_TOPIC_ORDER) {
        const content = PROMPT_GUIDE_CONTENT_BY_LOCALE[locale].topics[topic];
        const flattened = flatten(content);
        for (const value of Object.values(flattened)) {
          expect(value.toLowerCase(), `${locale}/${topic}`).not.toMatch(
            /\beliminates? hallucinat/u,
          );
          expect(value.toLowerCase(), `${locale}/${topic}`).not.toMatch(/\bguarantees? correct/u);
        }
      }
    },
  );
});
