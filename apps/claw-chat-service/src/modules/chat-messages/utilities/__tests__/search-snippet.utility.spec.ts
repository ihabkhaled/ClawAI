import { buildSearchSnippet } from '../search-snippet.utility';

describe('buildSearchSnippet', () => {
  it('centres the preview on the match, not on the start of the message', () => {
    // Taking the first N characters makes every result in a long thread look
    // identical, which is the failure this exists to avoid.
    const content = `${'a'.repeat(300)} NEEDLE ${'b'.repeat(300)}`;

    const snippet = buildSearchSnippet(content, 'needle');

    expect(snippet).toContain('NEEDLE');
    expect(snippet.length).toBeLessThan(content.length);
  });

  it('marks both cuts, so a reader can tell the message continues', () => {
    const content = `${'a'.repeat(300)} NEEDLE ${'b'.repeat(300)}`;

    const snippet = buildSearchSnippet(content, 'needle');

    expect(snippet.startsWith('…')).toBe(true);
    expect(snippet.endsWith('…')).toBe(true);
  });

  it('does not mark a cut that did not happen', () => {
    const snippet = buildSearchSnippet('short NEEDLE message', 'needle');

    expect(snippet).toBe('short NEEDLE message');
  });

  it('matches case-insensitively, like the query that produced the row', () => {
    expect(buildSearchSnippet('The Needle is here', 'NEEDLE')).toContain('Needle');
  });

  it('falls back to the opening when the term cannot be located in the text', () => {
    // The row matched in Postgres but not in JavaScript — possible with
    // collation differences. An empty preview would be worse than a generic one.
    const content = 'x'.repeat(400);

    const snippet = buildSearchSnippet(content, 'needle');

    expect(snippet.length).toBeGreaterThan(0);
    expect(snippet.endsWith('…')).toBe(true);
  });

  it('returns a short unmatched message whole rather than eliding nothing', () => {
    expect(buildSearchSnippet('tiny', 'needle')).toBe('tiny');
  });
});
