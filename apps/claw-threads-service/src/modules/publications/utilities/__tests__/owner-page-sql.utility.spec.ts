import {
  buildOwnerPageCountQuery,
  buildOwnerPageIdsQuery,
  escapeLikePattern,
  matchesUntitledPlaceholder,
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
    expect(query.text).not.toMatch(/ ~\*? \$|SIMILAR TO/i);
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

describe('owner page search covers every source of the displayed title', () => {
  const search = (q: string) => buildOwnerPageIdsQuery({ ownerId: 'o', status: 'ALL', q }, 10, 0);

  it('matches the stored (picked) title, the approved one while a newer revision is held back', () => {
    const { text } = search('solar');
    expect(text).toContain(`newest."review_status" IN ('STALE', 'PENDING')`);
    expect(text).toContain('approved."title"');
  });

  it('matches the title derived from the article for the "Untitled draft" placeholder', () => {
    const { text } = search('photosynthesis');
    expect(text).toContain(`r."title" = 'Untitled draft'`);
    expect(text).toContain(`placeholder."markdown"`);
    expect(text).toContain('#{1,6}');
    expect(text).toContain('```');
    expect(text).toContain('left(');
  });

  it('matches a row with no title at all when the text is the word untitled or part of it', () => {
    expect(search('Untitled').text).toContain('IS NULL)');
    expect(search('untit').text).toContain('IS NULL)');
    expect(search('photosynthesis').text).not.toContain('IS NULL)');
    expect(matchesUntitledPlaceholder('UNTITLED')).toBe(true);
    expect(matchesUntitledPlaceholder('untitled draft')).toBe(false);
    expect(matchesUntitledPlaceholder('x')).toBe(false);
  });

  it('keeps escaping, binding and the owner scope with the derived title in play', () => {
    const query = search('100%_');
    expect(query.values).toEqual(['o', String.raw`%100\%\_%`, 10, 0]);
    expect(query.text).toContain('p."owner_id" = $1');
    expect(query.text).not.toContain('100%_');
  });

  it('no search adds none of the revision or article reads', () => {
    const { text } = buildOwnerPageIdsQuery({ ownerId: 'o', status: 'ALL' }, 10, 0);
    expect(text).not.toContain('placeholder');
  });
});
