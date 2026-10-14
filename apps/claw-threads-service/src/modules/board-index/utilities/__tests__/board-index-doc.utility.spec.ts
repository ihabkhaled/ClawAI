import { describe, expect, it } from 'vitest';

import type { BoardIndexSource } from '../../types/board-index.types';
import { BOARD_DOC_FORMAT_VERSION } from '../../constants/board-index.constants';
import { buildBoardIndexDoc, stripCitationMarkers } from '../board-index-doc.utility';

function source(overrides: Partial<BoardIndexSource>): BoardIndexSource {
  return {
    publicationId: 'p1',
    slug: 's',
    contentLocale: 'zh',
    publicationType: 'GUIDE',
    publishedAt: new Date('2026-10-01T00:00:00Z'),
    viewCount: 0,
    title: 'Title',
    markdown: 'body',
    sourceCount: 0,
    likeCount: 0,
    dislikeCount: 0,
    commentCount: 0,
    ...overrides,
  };
}

describe('stripCitationMarkers', () => {
  it('removes single and doubled bracket hash markers', () => {
    const cleaned = stripCitationMarkers('a [b9e5088333f64bee] b [[922197023defa567]] c');
    expect(cleaned).not.toMatch(/b9e5088333f64bee|922197023defa567|\[/u);
  });

  it('removes comma lists and nested lists of markers', () => {
    const a = '922197023defa567';
    const b = '9f056d1e0e48b360';
    for (const marker of [`[${a}, ${b}]`, `[${a},${b}]`, `[[${a}], [${b}]]`, `[[${a}, ${b}]]`]) {
      expect(stripCitationMarkers(`x ${marker}。`).replaceAll(/\s+/gu, ' ')).toBe('x 。');
    }
  });

  it('strips a marker that follows an ordinary bracket and keeps the ordinary one', () => {
    expect(stripCitationMarkers('see [abc] [922197023defa567]').trim()).toBe('see [abc]');
  });

  it('keeps ordinary brackets and short hex', () => {
    expect(stripCitationMarkers('see [1] and [abc123]')).toBe('see [1] and [abc123]');
  });
});

describe('buildBoardIndexDoc', () => {
  it('keeps markers out of the excerpt, title and searchable body', () => {
    const doc = buildBoardIndexDoc(
      source({
        title: 'Tokens [b9e5088333f64bee]',
        markdown: 'Tokenized text [b9e5088333f64bee] continues [[922197023defa567]].',
      }),
    );
    expect(doc.title).toBe('Tokens');
    expect(doc.excerpt).not.toContain('b9e5088333f64bee');
    expect(doc.excerpt).not.toContain('[');
    expect(doc.bodyNorm).not.toContain('b9e5088333f64bee');
    expect(doc.bodyNorm).not.toContain('922197023defa567');
    expect(doc.titleNorm).toBe('tokens');
  });

  it('writes segmented Chinese body text at the current format version', () => {
    const doc = buildBoardIndexDoc(source({ markdown: '免疫系统很重要' }));
    expect(doc.bodyNorm.split(' ')).toContain('免疫');
    expect(doc.formatVersion).toBe(BOARD_DOC_FORMAT_VERSION);
  });
});

describe('stripCitationMarkers whitespace inside brackets', () => {
  const id1 = 'efc2e342efd8b15e';
  const id2 = '0123456789abcdef';
  it.each([
    [`[ ${id1}]`],
    [`[${id1} ]`],
    [`[ ${id1} , ${id2} ]`],
    [`[\n${id1}\n]`],
    [`[ \t${id1}\n , \n${id2}  ]`],
  ])('removes %j and leaves the sentence', (marker) => {
    const cleaned = stripCitationMarkers(`Sunsets are red ${marker} and long.`);
    expect(cleaned).toBe('Sunsets are red and long.');
  });

  it('keeps a bracket that holds a non-id word', () => {
    expect(stripCitationMarkers('see [ note ] here')).toBe('see [ note ] here');
  });

  it('keeps the excerpt of a built doc free of the marker', () => {
    const doc = buildBoardIndexDoc(source({ markdown: `Hello [ ${id1}] world` }));
    expect(doc.excerpt).toBe('Hello world');
  });

  it('is written at format version 4 so old rows are re-indexed', () => {
    expect(BOARD_DOC_FORMAT_VERSION).toBeGreaterThanOrEqual(4);
  });

  it('stays linear on whitespace-heavy unclosed brackets', () => {
    const started = Date.now();
    stripCitationMarkers(`[${' \n'.repeat(100_000)}`);
    stripCitationMarkers('[ a'.repeat(100_000));
    expect(Date.now() - started).toBeLessThan(1500);
  });
});

describe('stripCitationMarkers cost', () => {
  it('stays linear on a body of unclosed brackets and on long hex runs', () => {
    const hostile = [
      '['.repeat(200_000),
      `[${'a1 '.repeat(100_000)}`,
      `${'[a,'.repeat(70_000)}x`,
      '[x'.repeat(100_000),
      'text [zz] '.repeat(30_000),
    ];
    for (const body of hostile) {
      const started = Date.now();
      stripCitationMarkers(body);
      expect(Date.now() - started).toBeLessThan(1500);
    }
  });
});
