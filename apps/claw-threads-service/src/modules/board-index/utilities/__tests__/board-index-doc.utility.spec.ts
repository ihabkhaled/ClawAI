import { describe, expect, it } from 'vitest';

import type { BoardIndexSource } from '../../types/board-index.types';
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
    expect(doc.formatVersion).toBe(2);
  });
});
