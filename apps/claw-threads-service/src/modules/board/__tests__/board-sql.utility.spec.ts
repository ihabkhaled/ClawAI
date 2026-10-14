import { describe, expect, it } from 'vitest';

import {
  buildCountQuery,
  buildDidYouMeanQuery,
  buildListQuery,
  buildOrderBy,
  buildSuggestCountQuery,
  buildSuggestQuery,
  buildThresholdQuery,
  isShortQuery,
} from '../utilities/board-sql.utility';

const base = {
  q: '',
  lang: 'all',
  type: 'all',
  sort: 'latest' as const,
  page: 1,
  limit: 12,
  userId: 'u1',
};

describe('board SQL builders', () => {
  it('lists with the visibility predicate and parameterises the user', () => {
    const query = buildListQuery(base);
    expect(query.sql).toContain("p.status = 'PUBLISHED'");
    expect(query.sql).toContain("r.review_status = 'OWNER_APPROVED'");
    expect(query.sql).toContain('index_eligible = true');
    expect(query.sql).not.toContain('WHERE d.');
    expect(query.values).toEqual(['u1', 12, 0]);
  });

  it('lists for a guest with the same predicate, no reaction join and a null viewer column', () => {
    const query = buildListQuery({ ...base, userId: null });
    expect(query.sql).toContain("p.status = 'PUBLISHED'");
    expect(query.sql).toContain("r.review_status = 'OWNER_APPROVED'");
    expect(query.sql).toContain('index_eligible = true');
    expect(query.sql).not.toContain('thread_publication_reactions');
    expect(query.sql).toContain('NULL::text AS "viewerReaction"');
    expect(query.values).toEqual([12, 0]);
  });

  it('applies filters and offset as parameters', () => {
    const query = buildListQuery({ ...base, lang: 'fr', type: 'guide', page: 3, limit: 24 });
    expect(query.text).toContain('d.content_locale = $');
    expect(query.text).toContain('d.publication_type = $');
    expect(query.values).toEqual(['u1', 'fr', 'guide', 24, 48]);
  });

  it('never inlines user text and escapes LIKE wildcards', () => {
    const query = buildCountQuery({ q: "50%_'; drop", lang: 'all', type: 'all' });
    expect(query.sql).not.toContain('drop');
    expect(query.values).toContain("50%_'; drop");
    expect(query.values).toContain("%50\\%\\_'; drop%");
    expect(query.sql).toContain("ESCAPE '\\'");
  });

  it('ranks by relevance when searching on latest, with a stable tie-break', () => {
    const order = buildOrderBy('latest', 'x');
    expect(order.sql).toContain('ts_rank_cd');
    expect(order.sql).toContain('d.published_at DESC, d.slug DESC');
    expect(buildOrderBy('latest', '').sql).toBe('ORDER BY d.published_at DESC, d.slug DESC');
  });

  it('orders by each metric', () => {
    expect(buildOrderBy('liked', '').sql).toContain('d.like_count DESC');
    expect(buildOrderBy('discussed', '').sql).toContain('d.comment_count DESC');
    expect(buildOrderBy('trending', '').sql).toContain('d.trending_score DESC');
    expect(buildOrderBy('trending', '').sql).not.toContain('POWER');
    expect(buildOrderBy('trending', '').sql).toContain('d.slug DESC');
  });

  it('suggest is limited to 10 and the count is capped', () => {
    const suggest = buildSuggestQuery('ab', 'en');
    expect(suggest.values).toContain(10);
    expect(suggest.values).toContain('en');
    expect(buildSuggestCountQuery('ab', 'all').values).toContain(101);
  });

  it('searches with indexable operators, not similarity function calls (D-P1)', () => {
    const where = buildCountQuery({ q: 'quantum', lang: 'all', type: 'all' }).sql;
    expect(where).toContain('d.title_norm % ');
    expect(where).toContain('<% d.title_norm');
    expect(where).not.toMatch(/similarity(.*)s*>=/);
    expect(where).toContain('LIKE');
  });

  it('parses user text as words, never as websearch operators (B-05)', () => {
    const sql = buildCountQuery({ q: '-vector "or" x', lang: 'all', type: 'all' });
    expect(sql.sql).toContain('plainto_tsquery');
    expect(sql.sql).not.toContain('websearch_to_tsquery');
    expect(sql.values).toContain('-vector "or" x');
  });

  it('runs only a prefix arm for suggestions shorter than 3 characters (D-P2)', () => {
    expect(isShortQuery('ab')).toBe(true);
    expect(isShortQuery('abc')).toBe(false);
    expect(isShortQuery('免疫')).toBe(true);
    const suggest = buildSuggestCountQuery('ku', 'all');
    expect(suggest.sql).not.toContain('<%');
    expect(suggest.sql).not.toContain('d.title_norm % ');
    expect(suggest.values).toContain('ku%');
    expect(suggest.values).not.toContain('%ku%');
    expect(buildSuggestQuery('ku', 'all').sql).not.toContain('<%');
  });

  it('the list may look inside a short title, suggestions never do', () => {
    expect(buildCountQuery({ q: 'ku', lang: 'all', type: 'all' }).values).toContain('%ku%');
  });

  it('keeps the trigram arms for 3+ characters, including suggestions', () => {
    const suggest = buildSuggestCountQuery('kub', 'all');
    expect(suggest.sql).toContain('<% d.title_norm');
    expect(suggest.values).toContain('%kub%');
  });

  it('sets both trigram thresholds locally to the transaction', () => {
    const query = buildThresholdQuery();
    expect(query.sql).toContain("set_config('pg_trgm.similarity_threshold'");
    expect(query.sql).toContain("set_config('pg_trgm.word_similarity_threshold'");
    expect(query.sql.split(', true)')).toHaveLength(3);
    expect(query.values).toEqual(['0.3', '0.45']);
  });

  it('did-you-mean reads the indexed dictionary, not the documents (D-P4)', () => {
    const query = buildDidYouMeanQuery(['kubernets'], 'all');
    expect(query.sql).toContain('FROM thread_board_words w');
    expect(query.sql).toContain('w.word % t.token');
    expect(query.sql).not.toContain('regexp_split_to_table');
    expect(query.sql).not.toContain('w.lang =');
    expect(query.values).toContainEqual(['kubernets']);
  });

  it('did-you-mean honours the language filter', () => {
    const query = buildDidYouMeanQuery(['kubernets'], 'de');
    expect(query.sql).toContain('w.lang = ');
    expect(query.values).toContain('de');
  });
});
