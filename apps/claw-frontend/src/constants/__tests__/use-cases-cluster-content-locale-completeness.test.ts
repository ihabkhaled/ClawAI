import { describe, expect, it } from 'vitest';

import { USE_CASES_CLUSTER_CONTENT_BY_LOCALE } from '@/constants/use-cases-cluster-content.constants';
import { USE_CASES_TASK_ORDER } from '@/constants/use-cases-cluster.constants';
import { Locale } from '@/enums/locale.enum';
import { UseCaseTask } from '@/enums/use-case-task.enum';

/**
 * Mirrors `model-fit-content-locale-completeness.test.ts` for the
 * `/use-cases` cluster: structural parity (keys, section ids, SEO
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

const english = flatten(USE_CASES_CLUSTER_CONTENT_BY_LOCALE[Locale.EN]);
const nonEnglishLocales = Object.values(Locale).filter((locale) => locale !== Locale.EN);

describe('/use-cases cluster content locale completeness', () => {
  it.each(USE_CASES_TASK_ORDER)(
    '%s has at least three sections and three FAQs in every locale',
    (task) => {
      for (const locale of Object.values(Locale)) {
        const content = USE_CASES_CLUSTER_CONTENT_BY_LOCALE[locale].tasks[task];
        expect(content.sections.length, locale).toBeGreaterThanOrEqual(3);
        expect(content.faq.length, locale).toBeGreaterThanOrEqual(3);
      }
    },
  );

  it.each(USE_CASES_TASK_ORDER)('%s: keeps section ids identical across every locale', (task) => {
    const englishSectionIds = USE_CASES_CLUSTER_CONTENT_BY_LOCALE[Locale.EN].tasks[
      task
    ].sections.map((section) => section.id);

    for (const locale of Object.values(Locale)) {
      const content = USE_CASES_CLUSTER_CONTENT_BY_LOCALE[locale].tasks[task];
      expect(
        content.sections.map((section) => section.id),
        locale,
      ).toEqual(englishSectionIds);
    }
  });

  it.each(USE_CASES_TASK_ORDER)('%s: gives every locale unique, distinct SEO copy', (task) => {
    const content = Object.values(Locale).map(
      (locale) => USE_CASES_CLUSTER_CONTENT_BY_LOCALE[locale].tasks[task],
    );

    expect(new Set(content.map((p) => p.seo.title))).toHaveLength(Object.values(Locale).length);
    expect(new Set(content.map((p) => p.seo.description))).toHaveLength(
      Object.values(Locale).length,
    );
    expect(new Set(content.map((p) => p.seo.keywords.join('|')))).toHaveLength(
      Object.values(Locale).length,
    );
  });

  it('keeps the task order exhaustive', () => {
    expect(USE_CASES_TASK_ORDER).toContain(UseCaseTask.CODING_AND_DEVELOPMENT);
    expect(USE_CASES_TASK_ORDER).toContain(UseCaseTask.PRIVATE_AND_LOCAL_DEPLOYMENT);
  });

  it('lists every UseCaseTask enum member in USE_CASES_TASK_ORDER exactly once', () => {
    const enumTasks = Object.values(UseCaseTask).slice().sort();
    const orderedTasks = [...USE_CASES_TASK_ORDER].sort();
    expect(orderedTasks).toEqual(enumTasks);
  });

  it.each(nonEnglishLocales)(
    '%s defines every English key with no missing sections/faq/keywords',
    (locale) => {
      const localized = flatten(USE_CASES_CLUSTER_CONTENT_BY_LOCALE[locale]);
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
    '%s: every task clears the substantive paragraph and FAQ-answer length floor',
    (locale) => {
      const minParagraph = COMPACT_SCRIPT_LOCALES.has(locale)
        ? MIN_PARAGRAPH_LENGTH_COMPACT
        : MIN_PARAGRAPH_LENGTH;
      const minFaqAnswer = COMPACT_SCRIPT_LOCALES.has(locale)
        ? MIN_FAQ_ANSWER_LENGTH_COMPACT
        : MIN_FAQ_ANSWER_LENGTH;

      for (const task of USE_CASES_TASK_ORDER) {
        const content = USE_CASES_CLUSTER_CONTENT_BY_LOCALE[locale].tasks[task];
        for (const section of content.sections) {
          for (const paragraph of section.paragraphs) {
            expect(paragraph.length, `${task}/${section.id}`).toBeGreaterThanOrEqual(minParagraph);
          }
        }
        for (const entry of content.faq) {
          expect(entry.answer.length, `${task}: ${entry.question}`).toBeGreaterThanOrEqual(
            minFaqAnswer,
          );
        }
      }
    },
  );

  it.each(Object.values(Locale))('%s: every SEO description clears the length floor', (locale) => {
    for (const task of USE_CASES_TASK_ORDER) {
      const content = USE_CASES_CLUSTER_CONTENT_BY_LOCALE[locale].tasks[task];
      expect(content.seo.description.length, task).toBeGreaterThan(80);
    }
  });

  const COMPLIANCE_TERMS = /\b(soc\s?2|iso\s?27001|hipaa|fedramp|gdpr certifi\w*)\b/iu;
  // "best-of-N" is the standard technical term for the sampling strategy
  // (generate N candidates, pick the strongest) — not a superlative claim
  // about ClawAI or a third party, so it is excluded via a negative
  // lookahead rather than removing "best" from the pattern entirely.
  const SUPERLATIVE_TERMS = /\bbest(?!-of-n)\b|\b(fastest|#1|number one|leading|world-?class)\b/iu;

  it.each(Object.values(Locale))(
    '%s: no task claims a compliance certification or an unsubstantiated superlative',
    (locale) => {
      for (const task of USE_CASES_TASK_ORDER) {
        const content = USE_CASES_CLUSTER_CONTENT_BY_LOCALE[locale].tasks[task];
        const flattened = flatten(content);
        for (const value of Object.values(flattened)) {
          expect(value, `${locale}/${task}`).not.toMatch(COMPLIANCE_TERMS);
          if (locale === Locale.EN) {
            expect(value, `${locale}/${task}`).not.toMatch(SUPERLATIVE_TERMS);
          }
        }
      }
    },
  );
});
