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

  it('leaves CJK text unchanged', () => {
    expect(normalizeSearchText('日本語のテスト')).toBe('日本語のテスト');
  });

  it('keeps Devanagari and Thai marks', () => {
    expect(normalizeSearchText('हिन्दी में')).toBe('हिन्दी में');
    expect(normalizeSearchText('ภาษาไทย ที่')).toBe('ภาษาไทย ที่');
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
