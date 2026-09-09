import { describe, expect, it } from 'vitest';

import { MODEL_FIT_CONTENT_BY_LOCALE } from '@/constants/model-fit-content.constants';
import { MODEL_FIT_TASK_ORDER } from '@/constants/model-fit.constants';
import { Locale } from '@/enums/locale.enum';
import { ModelFitTask } from '@/enums/model-fit-task.enum';

/**
 * Mirrors `models-content-locale-completeness.test.ts` for the `/model-fit`
 * cluster: structural parity (keys, section ids, SEO uniqueness, exhaustive
 * order-array coverage) and a substantive-content length floor. Deliberately
 * does NOT assert "no untranslated English fallback" — this cluster's copy
 * was produced by independent per-locale translation passes, and several
 * product proper nouns and routing-mode names (ClawAI, OpenAI, Anthropic,
 * Ollama, llama.cpp, Auto, Manual Model, High Reasoning, Cost Saver,
 * Local-Only, Privacy-First) are legitimately identical across locales.
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

const english = flatten(MODEL_FIT_CONTENT_BY_LOCALE[Locale.EN]);
const nonEnglishLocales = Object.values(Locale).filter((locale) => locale !== Locale.EN);

describe('/model-fit content locale completeness', () => {
  it.each(MODEL_FIT_TASK_ORDER)(
    '%s has at least three sections and three FAQs in every locale',
    (task) => {
      for (const locale of Object.values(Locale)) {
        const content = MODEL_FIT_CONTENT_BY_LOCALE[locale].tasks[task];
        expect(content.sections.length, locale).toBeGreaterThanOrEqual(3);
        expect(content.faq.length, locale).toBeGreaterThanOrEqual(3);
      }
    },
  );

  it.each(MODEL_FIT_TASK_ORDER)('%s: keeps section ids identical across every locale', (task) => {
    const englishSectionIds = MODEL_FIT_CONTENT_BY_LOCALE[Locale.EN].tasks[task].sections.map(
      (section) => section.id,
    );

    for (const locale of Object.values(Locale)) {
      const content = MODEL_FIT_CONTENT_BY_LOCALE[locale].tasks[task];
      expect(
        content.sections.map((section) => section.id),
        locale,
      ).toEqual(englishSectionIds);
    }
  });

  it.each(MODEL_FIT_TASK_ORDER)('%s: gives every locale unique, distinct SEO copy', (task) => {
    const content = Object.values(Locale).map(
      (locale) => MODEL_FIT_CONTENT_BY_LOCALE[locale].tasks[task],
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
    expect(MODEL_FIT_TASK_ORDER).toContain(ModelFitTask.CODING);
    expect(MODEL_FIT_TASK_ORDER).toContain(ModelFitTask.PRIVATE_LOCAL_WORKLOADS);
  });

  it('lists every ModelFitTask enum member in MODEL_FIT_TASK_ORDER exactly once', () => {
    const enumTasks = Object.values(ModelFitTask).slice().sort();
    const orderedTasks = [...MODEL_FIT_TASK_ORDER].sort();
    expect(orderedTasks).toEqual(enumTasks);
  });

  it.each(nonEnglishLocales)(
    '%s defines every English key with no missing sections/faq/keywords',
    (locale) => {
      const localized = flatten(MODEL_FIT_CONTENT_BY_LOCALE[locale]);
      expect(Object.keys(localized).sort()).toEqual(Object.keys(english).sort());
    },
  );

  /**
   * Same measurement-derived floors as `models-content-locale-completeness.test.ts`.
   */
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

      for (const task of MODEL_FIT_TASK_ORDER) {
        const content = MODEL_FIT_CONTENT_BY_LOCALE[locale].tasks[task];
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

  it.each(Object.values(Locale))(
    '%s: every task carries a non-empty catalog disclaimer',
    (locale) => {
      for (const task of MODEL_FIT_TASK_ORDER) {
        const content = MODEL_FIT_CONTENT_BY_LOCALE[locale].tasks[task];
        expect(content.catalogDisclaimer.length, task).toBeGreaterThan(20);
      }
    },
  );

  it.each(Object.values(Locale))(
    '%s: no task claims model speed or latency, qualitatively or otherwise',
    (locale) => {
      for (const task of MODEL_FIT_TASK_ORDER) {
        const content = MODEL_FIT_CONTENT_BY_LOCALE[locale].tasks[task];
        const flattened = flatten(content);
        for (const value of Object.values(flattened)) {
          expect(value.toLowerCase(), `${locale}/${task}`).not.toMatch(/\blatency\b/u);
        }
      }
    },
  );
});
