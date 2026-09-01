import { describe, expect, it } from 'vitest';

import { LEARN_CONTENT_BY_LOCALE } from '@/constants/learn-content.constants';
import { Locale } from '@/enums/locale.enum';

/**
 * Flattens a `LearnDictionary` into `path -> string` pairs, the same shape
 * the i18n completeness tests use (see `chinese-completeness.test.ts`,
 * `translations.test.ts`). Arrays (e.g. `seo.keywords`) flatten by index,
 * which is exactly what parity needs: a locale with two keywords instead of
 * three shows up as a missing key, not a silently shorter array.
 */
function flatten(value: unknown, prefix = '', result: Record<string, string> = {}): Record<string, string> {
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
  it.each(nonEnglishLocales)('%s defines every English key with no missing sections/faq/keywords', (locale) => {
    const localized = flatten(LEARN_CONTENT_BY_LOCALE[locale]);
    expect(Object.keys(localized).sort()).toEqual(Object.keys(english).sort());
  });

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
});
