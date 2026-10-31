import {
  buildOwnerPageCountQuery,
  buildOwnerPageIdsQuery,
  escapeLikePattern,
} from '../owner-page-sql.utility';

describe('escapeLikePattern', () => {
  it('escapes percent, underscore and backslash so they match literally', () => {
    expect(escapeLikePattern('100%')).toBe('100\\%');
    expect(escapeLikePattern('a_b')).toBe('a\\_b');
    expect(escapeLikePattern('a\\b')).toBe('a\\\\b');
    expect(escapeLikePattern('%_\\')).toBe('\\%\\_\\\\');
  });

  it('leaves quotes alone: they travel as a bound parameter, never inside the SQL text', () => {
    expect(escapeLikePattern(`o'brien "x"`)).toBe(`o'brien "x"`);
  });
});

describe('owner page SQL', () => {
  const owner = 'owner-1';

  it('always scopes to the owner and binds every value', () => {
    const query = buildOwnerPageIdsQuery({ ownerId: owner, status: 'ALL' }, 10, 20);
    expect(query.text).toContain('p."owner_id" = $1');
    expect(query.values).toEqual([owner, 10, 20]);
    expect(query.text).not.toContain(owner);
  });

  it('orders newest first with the id as a tiebreak, so pages are stable', () => {
    const { text: sql } = buildOwnerPageIdsQuery({ ownerId: owner, status: 'ALL' }, 10, 0);
    expect(sql).toContain('ORDER BY p."created_at" DESC, p."id" DESC');
    expect(sql).toContain('LIMIT $2 OFFSET $3');
  });

  it('adds no revision joins and no ILIKE without a search', () => {
    const { text: sql } = buildOwnerPageIdsQuery({ ownerId: owner, status: 'ALL' }, 10, 0);
    expect(sql).not.toContain('LATERAL');
    expect(sql).not.toContain('ILIKE');
  });

  it('pushes the status filter down as a bound value', () => {
    const query = buildOwnerPageCountQuery({ ownerId: owner, status: 'FAILED' });
    expect(query.text).toContain('COUNT(*)');
    expect(query.text).toContain(`p."generation_state" IN ('FAILED', 'CANCELLED')`);
    expect(query.values).toEqual([owner, 'FAILED']);
  });

  it('searches the shown title with an escaped, bound ILIKE pattern and no regex', () => {
    const query = buildOwnerPageIdsQuery({ ownerId: owner, status: 'ALL', q: `50%_o'x` }, 10, 0);
    expect(query.text).toContain(`ILIKE $2 ESCAPE '\\'`);
    expect(query.values[1]).toBe(`%50\\%\\_o'x%`);
    expect(query.text).not.toMatch(/~|SIMILAR TO|regexp/i);
    expect(query.text).toContain('LATERAL');
    expect(query.text).not.toContain(`o'x`);
  });

  it('count and ids use the same filter values', () => {
    const filter = { ownerId: owner, status: 'READY' as const, q: 'abc' };
    const ids = buildOwnerPageIdsQuery(filter, 10, 0);
    const count = buildOwnerPageCountQuery(filter);
    expect(ids.values.slice(0, 3)).toEqual(count.values);
  });
});
