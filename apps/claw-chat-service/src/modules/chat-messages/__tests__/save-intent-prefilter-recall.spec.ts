import { mightBeSaveRequest } from '../utilities/save-intent.utility';
import {
  SAVE_INTENT_CORPUS,
  SAVE_INTENT_CORPUS_LOCALES,
  type SaveIntentCorpusLocale,
} from './fixtures/save-intent-corpus';

const MIN_RECALL = 0.95;
const MAX_NEGATIVE_PASS_RATE = 0.6;
const MIN_PHRASES_PER_CLASS = 12;

function rate(passed: number, total: number): number {
  return total === 0 ? 0 : passed / total;
}

describe('save-intent pre-filter corpus', () => {
  it('covers all 13 locales with enough phrasings', () => {
    expect(SAVE_INTENT_CORPUS_LOCALES).toHaveLength(13);
    for (const locale of SAVE_INTENT_CORPUS_LOCALES) {
      expect(SAVE_INTENT_CORPUS[locale].positives.length).toBeGreaterThanOrEqual(
        MIN_PHRASES_PER_CLASS,
      );
      expect(SAVE_INTENT_CORPUS[locale].negatives.length).toBeGreaterThanOrEqual(
        MIN_PHRASES_PER_CLASS,
      );
    }
  });
});

describe('mightBeSaveRequest recall', () => {
  it.each(SAVE_INTENT_CORPUS_LOCALES.map((locale) => [locale]))(
    'passes at least 95% of clear save requests in %s',
    (locale: SaveIntentCorpusLocale) => {
      const { positives } = SAVE_INTENT_CORPUS[locale];
      const misses = positives.filter((text) => !mightBeSaveRequest(text));
      const recall = rate(positives.length - misses.length, positives.length);
      expect(
        recall,
        `${locale} recall ${recall.toFixed(3)} (${misses.length}/${positives.length} missed): ${JSON.stringify(misses)}`,
      ).toBeGreaterThanOrEqual(MIN_RECALL);
    },
  );
});

describe('mightBeSaveRequest precision budget', () => {
  it.each(SAVE_INTENT_CORPUS_LOCALES.map((locale) => [locale]))(
    'passes at most 60% of non-save messages in %s',
    (locale: SaveIntentCorpusLocale) => {
      const { negatives } = SAVE_INTENT_CORPUS[locale];
      const passed = negatives.filter((text) => mightBeSaveRequest(text));
      const passRate = rate(passed.length, negatives.length);
      expect(
        passRate,
        `${locale} negative pass rate ${passRate.toFixed(3)}: ${JSON.stringify(passed)}`,
      ).toBeLessThanOrEqual(MAX_NEGATIVE_PASS_RATE);
    },
  );
});

describe('mightBeSaveRequest benign messages (generic words alone are not a save request)', () => {
  it('covers every locale with at least three benign messages', () => {
    for (const locale of SAVE_INTENT_CORPUS_LOCALES) {
      expect(SAVE_INTENT_CORPUS[locale].benign.length).toBeGreaterThanOrEqual(3);
    }
  });

  it.each(SAVE_INTENT_CORPUS_LOCALES.map((locale) => [locale]))(
    'passes none of the benign messages in %s',
    (locale: SaveIntentCorpusLocale) => {
      const { benign } = SAVE_INTENT_CORPUS[locale];
      const passed = benign.filter((text) => mightBeSaveRequest(text));
      expect(
        passed,
        `${locale} benign messages that wrongly pass: ${JSON.stringify(passed)}`,
      ).toEqual([]);
    },
  );

  it('still passes a generic word when a second, different one backs it up', () => {
    expect(mightBeSaveRequest('Добавь это в пакет')).toBe(true);
    expect(mightBeSaveRequest('追加してこのノートに')).toBe(true);
    expect(mightBeSaveRequest('Add the package; call me Sam; never use var')).toBe(true);
  });
});
