import { describe, expect, it } from 'vitest';

import { estimateReadingMinutes, textSearchConfigFor } from '../board-index-doc.utility';
import { normalizeSearchText } from '../board-search-normalizer.utility';

describe('normalizeSearchText', () => {
  it('strips Latin accents and lowercases', () => {
    expect(normalizeSearchText('Crème Brûlée À LA Café')).toBe('creme brulee a la cafe');
  });

  it('strips Cyrillic combining marks', () => {
    expect(normalizeSearchText('Ёлка')).toBe('елка');
  });

  it('removes Arabic tashkeel and tatweel', () => {
    expect(normalizeSearchText('مُحَمَّد')).toBe(normalizeSearchText('محمد'));
    expect(normalizeSearchText('كـــتاب')).toBe('كتاب');
  });

  it('folds alef, hamza, ya and ta marbuta variants', () => {
    expect(normalizeSearchText('أحمد')).toBe(normalizeSearchText('احمد'));
    expect(normalizeSearchText('إسلام')).toBe(normalizeSearchText('اسلام'));
    expect(normalizeSearchText('مدرسة')).toBe(normalizeSearchText('مدرسه'));
    expect(normalizeSearchText('على')).toBe(normalizeSearchText('علي'));
    expect(normalizeSearchText('مسؤول')).toBe(normalizeSearchText('مسوول'));
  });

  it('folds Persian ya and kaf onto the Arabic letters', () => {
    expect(normalizeSearchText('کتاب فارسی')).toBe(normalizeSearchText('كتاب فارسي'));
  });

  it('keeps CJK characters and only inserts word breaks', () => {
    expect(normalizeSearchText('日本語のテスト')).toBe('日本語 の テスト');
  });

  it('keeps Devanagari and Thai marks', () => {
    expect(normalizeSearchText('हिन्दी में')).toBe('हिन्दी में');
    expect(normalizeSearchText('ภาษาไทย ที่')).toBe('ภาษา ไทย ที่');
  });

  it('turns control characters into spaces and collapses whitespace', () => {
    expect(normalizeSearchText('a\u0000b\u0007  c\n\td\u200Be')).toBe('a b c d e');
  });

  it('is idempotent', () => {
    const once = normalizeSearchText('Été مُحَمَّد ёлка');
    expect(normalizeSearchText(once)).toBe(once);
  });
});

describe('textSearchConfigFor', () => {
  it('maps known locales and falls back to simple', () => {
    expect(textSearchConfigFor('en')).toBe('english');
    expect(textSearchConfigFor('pt-BR')).toBe('portuguese');
    expect(textSearchConfigFor('ar')).toBe('simple');
    expect(textSearchConfigFor('zh')).toBe('simple');
  });
});

describe('estimateReadingMinutes', () => {
  it('is at least one minute', () => {
    expect(estimateReadingMinutes('')).toBe(1);
  });

  it('counts words and CJK characters', () => {
    expect(estimateReadingMinutes('word '.repeat(440))).toBe(2);
    expect(estimateReadingMinutes('字'.repeat(800))).toBe(2);
  });
});

describe('normalizeSearchText word segmentation', () => {
  it('splits an unspaced Chinese run so a word inside it is a term', () => {
    expect(normalizeSearchText('免疫系统')).toBe('免疫 系统');
    expect(normalizeSearchText('免疫系统').split(' ')).toContain('免疫');
  });

  it('splits Japanese kana and folds halfwidth katakana before segmenting', () => {
    expect(normalizeSearchText('ｿｰﾗｰパネル')).toBe(normalizeSearchText('ソーラーパネル'));
    expect(normalizeSearchText('ソーラーパネル')).toContain('ソーラー');
  });

  it('splits Thai text into words', () => {
    expect(normalizeSearchText('ภาษาไทย').split(' ').length).toBeGreaterThan(1);
  });

  it('keeps a single character and Latin text untouched, and separates a run from adjacent Latin', () => {
    expect(normalizeSearchText('免')).toBe('免');
    expect(normalizeSearchText('Hello World')).toBe('hello world');
    expect(normalizeSearchText('abc免疫def').split(' ')).toEqual(['abc', '免疫', 'def']);
  });

  it('gives the index form and the query form of the same text', () => {
    expect(normalizeSearchText('免疫系统是什么')).toBe(normalizeSearchText('  免疫系统是什么 '));
  });
});
