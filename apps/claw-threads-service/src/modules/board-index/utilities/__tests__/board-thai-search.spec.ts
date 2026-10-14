import { describe, expect, it } from 'vitest';

import { BOARD_ALL } from '../../../board/constants/board.constants';
import { buildCountQuery, buildOrderBy } from '../../../board/utilities/board-sql.utility';
import { normalizeSearchText } from '../board-search-normalizer.utility';
import { buildBoardIndexDoc } from '../board-index-doc.utility';
import type { BoardIndexSource } from '../../types/board-index.types';

const TITLE = 'คู่มือการเรียนรู้ภาษาไทยสำหรับผู้เริ่มต้น';
const BODY = 'การค้นหาข้อความภาษาไทยต้องตัดคำก่อนจัดทำดัชนี [b9e5088333f64bee] เพื่อให้ค้นหาได้';

function thaiSource(): BoardIndexSource {
  return {
    publicationId: 'p-th',
    slug: 'thai-guide',
    contentLocale: 'th',
    publicationType: 'GUIDE',
    publishedAt: new Date('2026-10-01T00:00:00Z'),
    viewCount: 0,
    title: TITLE,
    markdown: BODY,
    sourceCount: 1,
    likeCount: 0,
    dislikeCount: 0,
    commentCount: 0,
  };
}

function words(text: string): string[] {
  return text.split(' ').filter(Boolean);
}

describe('Thai Board search', () => {
  it('indexes a Thai title and body as separated words with no source marker', () => {
    const doc = buildBoardIndexDoc(thaiSource());

    expect(words(doc.titleNorm).length).toBeGreaterThan(3);
    expect(words(doc.bodyNorm).length).toBeGreaterThan(5);
    expect(doc.bodyNorm).not.toContain('b9e5088333f64bee');
    expect(doc.textSearchConfig).toBe('simple');
  });

  it('segments a query the same way as the indexed text so its words are found in the index', () => {
    const doc = buildBoardIndexDoc(thaiSource());
    const query = normalizeSearchText('ภาษาไทย');
    const indexed = new Set(words(doc.titleNorm));

    expect(words(query).length).toBeGreaterThan(1);
    expect(words(query).every((word) => indexed.has(word))).toBe(true);
  });

  it('gives a Thai query to the SQL builders as a bound parameter, never as SQL text', () => {
    const q = normalizeSearchText('ภาษาไทย');
    const count = buildCountQuery({ q, lang: BOARD_ALL, type: BOARD_ALL });
    const order = buildOrderBy('latest', q);

    expect(count.sql).toContain('plainto_tsquery');
    expect(count.sql).not.toContain('ภาษา');
    expect(count.values).toContain(q);
    expect(order.sql).toContain('ts_rank_cd');
    expect(order.values).toContain(q);
  });

  it('uses the trigram arms for a Thai query of three or more characters', () => {
    const q = normalizeSearchText('ภาษาไทย');
    const { sql } = buildCountQuery({ q, lang: BOARD_ALL, type: BOARD_ALL });

    expect(sql).toContain('d.title_norm %');
    expect(sql).toContain('<% d.title_norm');
  });

  it('keeps a one or two character Thai query on full-text plus title LIKE only', () => {
    const { sql } = buildCountQuery({ q: 'ไท', lang: BOARD_ALL, type: BOARD_ALL });

    expect(sql).toContain('plainto_tsquery');
    expect(sql).not.toContain('d.title_norm %');
  });
});
