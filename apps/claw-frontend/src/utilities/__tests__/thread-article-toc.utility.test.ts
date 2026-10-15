import { describe, expect, it } from 'vitest';

import {
  estimateReadingMinutes,
  extractThreadToc,
  plainHeadingText,
} from '@/utilities/thread-article-toc.utility';
import { createHeadingSlugger, slugifyHeading } from '@/utilities/thread-heading-slug.utility';

describe('slugifyHeading', () => {
  it('keeps letters of any script and joins words with one dash', () => {
    expect(slugifyHeading('Price trend')).toBe('price-trend');
    expect(slugifyHeading('تطور الأسعار')).toBe('تطور-الأسعار');
    expect(slugifyHeading('価格の推移')).toBe('価格の推移');
    expect(slugifyHeading('Preis & Leistung (2024)!')).toBe('preis-leistung-2024');
  });

  it('never returns an empty id', () => {
    expect(slugifyHeading('!!! ???')).toBe('section');
  });

  it('cuts very long headings', () => {
    expect([...slugifyHeading('word '.repeat(60))].length).toBeLessThanOrEqual(80);
  });

  it('makes repeated headings unique in document order', () => {
    const slug = createHeadingSlugger();
    expect([slug('Overview'), slug('Overview'), slug('Overview'), slug('Overview 2')]).toEqual([
      'overview',
      'overview-2',
      'overview-3',
      'overview-2-2',
    ]);
  });
});

describe('plainHeadingText', () => {
  it('drops emphasis, code marks, links and html but keeps the words', () => {
    expect(plainHeadingText('Use **bold** and `code` in [a link](https://x.test)')).toBe(
      'Use bold and code in a link',
    );
    expect(plainHeadingText('A <b>tag</b> \\* star')).toBe('A tag * star');
  });
});

describe('extractThreadToc', () => {
  const article = [
    '# Solar costs',
    '',
    '## Price trend',
    'text',
    '### By year',
    '```',
    '## not a heading',
    '```',
    '## Price trend',
    '#### too deep',
    '# Second title',
  ].join('\n');

  it('lists H2 and H3, skips the repeated page title, code fences and deep headings', () => {
    expect(extractThreadToc(article, 'Solar costs')).toEqual([
      { id: 'price-trend', text: 'Price trend', level: 2 },
      { id: 'by-year', text: 'By year', level: 3 },
      { id: 'price-trend-2', text: 'Price trend', level: 2 },
      { id: 'second-title', text: 'Second title', level: 2 },
    ]);
  });

  it('keeps a first H1 that is not the page title (it is drawn as an h2)', () => {
    expect(extractThreadToc('# Other\n\n## A', 'Solar costs').map((item) => item.text)).toEqual([
      'Other',
      'A',
    ]);
  });

  it('gives Arabic headings their own anchors', () => {
    const items = extractThreadToc('## أهم النقاط\n\n## المصادر\n\n### تفاصيل');
    expect(items.map((item) => item.id)).toEqual(['أهم-النقاط', 'المصادر', 'تفاصيل']);
  });
});

describe('estimateReadingMinutes', () => {
  it('counts words for spaced languages and characters for ja, zh and th', () => {
    expect(estimateReadingMinutes('word '.repeat(440), 'en')).toBe(2);
    expect(estimateReadingMinutes('word', 'en')).toBe(1);
    expect(estimateReadingMinutes('語'.repeat(900), 'ja')).toBe(2);
  });

  it('does not count citation markers as words', () => {
    expect(estimateReadingMinutes(`${'a '.repeat(10)}[1234567890abcdef]`, 'en')).toBe(1);
  });
});
