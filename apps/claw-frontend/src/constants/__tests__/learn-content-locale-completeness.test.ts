import { describe, expect, it } from 'vitest';

import { LEARN_CONTENT_BY_LOCALE } from '@/constants/learn-content.constants';
import { LEARN_TOPIC_ORDER } from '@/constants/learn.constants';
import { LearnTopic } from '@/enums/learn-topic.enum';
import { Locale } from '@/enums/locale.enum';

/**
 * Flattens a `LearnDictionary` into `path -> string` pairs, the same shape
 * the i18n completeness tests use (see `chinese-completeness.test.ts`,
 * `translations.test.ts`). Arrays (e.g. `seo.keywords`) flatten by index,
 * which is exactly what parity needs: a locale with two keywords instead of
 * three shows up as a missing key, not a silently shorter array.
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

function placeholders(value: string): string[] {
  return [...value.matchAll(/\{[^{}]+\}/gu)].map((match) => match[0]).sort();
}

/**
 * Section anchor ids (`sections.<n>.id`) are deliberately identical across
 * every locale — "Stable across locales so a translated page keeps its deep
 * links" (`LearnSection` in `types/learn.types.ts`). They are structural,
 * not prose, so they are excluded from the "did anyone actually translate
 * this" check below, the same way a `data-testid` would be.
 */
function isStructuralKey(key: string): boolean {
  return key.endsWith('.id');
}

/**
 * Values that are correctly identical across every locale: proper nouns,
 * acronyms, product/model names, and other technical terms nobody
 * translates. Anything NOT on this list that matches English exactly is
 * either an untranslated string or a coincidence rare enough to be worth a
 * second look — see `chinese-completeness.test.ts` for the same pattern
 * against the general UI dictionary.
 */
const LEGITIMATE_UNCHANGED_VALUES = new Set<string>([
  'ClawAI',
  'RAG',
  'GPU',
  'CPU',
  'API',
  'LLM',
  'PDF',
  'URL',
  'GitHub',
  'Ollama',
  'llama.cpp',
  'Ollama vs llama.cpp',
  // French "orchestration" is spelled identically to English (it is in fact
  // the older of the two — the word entered English FROM French). Not a
  // missed translation: fr correctly translates the same English word to
  // "Orchestrazione"/"Orchestrierung" is what it/de do, which is a different
  // language having a different native form, not evidence fr is wrong.
  'Orchestration',
  // "Routing" is a standard, widely-used loanword in German and Italian
  // technical writing (as common as "Router" itself) — this repo's own de/it
  // copy elsewhere also keeps other loanwords (e.g. "GPU") rather than
  // coining an unfamiliar native term. Flagged here for visibility: if a
  // native speaker prefers a translated term, remove this line and fix the
  // two eyebrow values it currently allows through.
  'Routing',
  // SEO keyword arrays intentionally keep the English query term a non-English
  // searcher would actually type — "best of N" is ML/statistics jargon, not
  // prose, and translating it would target a search query nobody makes.
  'best of N',
]);

const english = flatten(LEARN_CONTENT_BY_LOCALE[Locale.EN]);
const nonEnglishLocales = Object.values(Locale).filter((locale) => locale !== Locale.EN);

describe('/learn content locale completeness', () => {
  it('includes a substantive language-model answer explainer in every locale', () => {
    const englishSectionIds = LEARN_CONTENT_BY_LOCALE[Locale.EN].topics[
      LearnTopic.HOW_LANGUAGE_MODELS_GENERATE_ANSWERS
    ].sections.map((section) => section.id);

    for (const locale of Object.values(Locale)) {
      const content =
        LEARN_CONTENT_BY_LOCALE[locale].topics[LearnTopic.HOW_LANGUAGE_MODELS_GENERATE_ANSWERS];
      expect(content.sections.length, locale).toBeGreaterThanOrEqual(4);
      expect(content.faq.length, locale).toBeGreaterThanOrEqual(3);
      expect(
        content.sections.map((section) => section.id),
        locale,
      ).toEqual(englishSectionIds);
    }
  });

  it('gives the language-model answer explainer unique SEO copy in every locale', () => {
    const content = Object.values(Locale).map(
      (locale) =>
        LEARN_CONTENT_BY_LOCALE[locale].topics[LearnTopic.HOW_LANGUAGE_MODELS_GENERATE_ANSWERS],
    );

    expect(new Set(content.map((topic) => topic.seo.title))).toHaveLength(
      Object.values(Locale).length,
    );
    expect(new Set(content.map((topic) => topic.seo.description))).toHaveLength(
      Object.values(Locale).length,
    );
    expect(new Set(content.map((topic) => topic.seo.keywords.join('|')))).toHaveLength(
      Object.values(Locale).length,
    );
  });

  it('includes a substantive AI-tokens explainer in every locale', () => {
    const englishSectionIds = LEARN_CONTENT_BY_LOCALE[Locale.EN].topics[
      LearnTopic.WHAT_ARE_AI_TOKENS
    ].sections.map((section) => section.id);

    for (const locale of Object.values(Locale)) {
      const content = LEARN_CONTENT_BY_LOCALE[locale].topics[LearnTopic.WHAT_ARE_AI_TOKENS];
      expect(content.sections.length, locale).toBeGreaterThanOrEqual(5);
      expect(content.faq.length, locale).toBeGreaterThanOrEqual(3);
      expect(
        content.sections.map((section) => section.id),
        locale,
      ).toEqual(englishSectionIds);
    }
  });

  it('gives the AI-tokens explainer unique SEO copy in every locale', () => {
    const content = Object.values(Locale).map(
      (locale) => LEARN_CONTENT_BY_LOCALE[locale].topics[LearnTopic.WHAT_ARE_AI_TOKENS],
    );

    expect(new Set(content.map((topic) => topic.seo.title))).toHaveLength(
      Object.values(Locale).length,
    );
    expect(new Set(content.map((topic) => topic.seo.description))).toHaveLength(
      Object.values(Locale).length,
    );
    expect(new Set(content.map((topic) => topic.seo.keywords.join('|')))).toHaveLength(
      Object.values(Locale).length,
    );
  });

  it('keeps the topic order exhaustive', () => {
    expect(LEARN_TOPIC_ORDER).toContain(LearnTopic.HOW_LANGUAGE_MODELS_GENERATE_ANSWERS);
    expect(LEARN_TOPIC_ORDER).toContain(LearnTopic.WHAT_ARE_AI_TOKENS);
  });

  it('lists every LearnTopic enum member in LEARN_TOPIC_ORDER exactly once', () => {
    // A plain `toContain` check catches an omission but not a duplicate, and a
    // duplicate silently drops another topic from the hub, the sitemap and
    // every other surface fanned out from this array. Comparing the full
    // sorted arrays catches both a missing member (lengths differ, or a value
    // is absent) and a duplicate (the same failure mode from the other side).
    const enumTopics = Object.values(LearnTopic).slice().sort();
    const orderedTopics = [...LEARN_TOPIC_ORDER].sort();
    expect(orderedTopics).toEqual(enumTopics);
  });

  it.each(nonEnglishLocales)(
    '%s defines every English key with no missing sections/faq/keywords',
    (locale) => {
      const localized = flatten(LEARN_CONTENT_BY_LOCALE[locale]);
      expect(Object.keys(localized).sort()).toEqual(Object.keys(english).sort());
    },
  );

  it.each(nonEnglishLocales)('%s preserves every interpolation placeholder', (locale) => {
    const localized = flatten(LEARN_CONTENT_BY_LOCALE[locale]);
    for (const key of Object.keys(english)) {
      expect(placeholders(localized[key] ?? ''), key).toEqual(placeholders(english[key] ?? ''));
    }
  });

  it.each(nonEnglishLocales)(
    '%s has no untranslated English fallback outside the approved technical terms',
    (locale) => {
      const localized = flatten(LEARN_CONTENT_BY_LOCALE[locale]);
      const unexpectedlyUnchanged = Object.keys(english)
        .filter((key) => !isStructuralKey(key))
        .filter((key) => localized[key] === english[key])
        .filter((key) => !LEGITIMATE_UNCHANGED_VALUES.has(english[key] ?? ''));

      expect(unexpectedlyUnchanged).toEqual([]);
    },
  );

  /**
   * The two prior assertions ("includes a substantive ... explainer") check
   * structure — section count, FAQ count, matching ids — but not that any
   * given paragraph or FAQ answer actually says anything. A one-sentence
   * stub passes them. These thresholds are evidence-based: measured against
   * every existing topic in every locale (`ar` and `ja` had the shortest
   * paragraphs and FAQ answers among the non-compact and compact scripts
   * respectively), so the floor sits comfortably below real content without
   * being loose enough to let a stub through.
   *
   * Chinese and Japanese are logographic and carry more meaning per
   * character than a Latin, Cyrillic, Arabic, Devanagari or Thai sentence of
   * the same length, so the same character-count floor would either be too
   * loose for those scripts or too strict for everything else. Two floors,
   * chosen from measurement rather than a guess, avoid both failure modes.
   */
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

      for (const topic of LEARN_TOPIC_ORDER) {
        const content = LEARN_CONTENT_BY_LOCALE[locale].topics[topic];
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
});
