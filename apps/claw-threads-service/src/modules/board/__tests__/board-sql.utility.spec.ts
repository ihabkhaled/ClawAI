import { describe, expect, it } from 'vitest';

import {
  buildCountQuery,
  buildDidYouMeanQuery,
  buildListQuery,
  buildOrderBy,
  buildSuggestCountQuery,
  buildSuggestQuery,
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
    expect(buildOrderBy('trending', '').sql).toContain('POWER');
    expect(buildOrderBy('trending', '').sql).toContain('d.slug DESC');
  });

  it('suggest is limited to 10 and the count is capped', () => {
    const suggest = buildSuggestQuery('ab', 'en');
    expect(suggest.values).toContain(10);
    expect(suggest.values).toContain('en');
    expect(buildSuggestCountQuery('ab', 'all').values).toContain(101);
  });

  it('did-you-mean only reads visible docs and passes tokens as an array', () => {
    const query = buildDidYouMeanQuery(['kubernets'], 'all');
    expect(query.sql).toContain("p.status = 'PUBLISHED'");
    expect(query.values).toContainEqual(['kubernets']);
  });
});
