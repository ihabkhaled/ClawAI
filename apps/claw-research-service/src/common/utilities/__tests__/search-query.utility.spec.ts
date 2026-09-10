import { clampSearchQuery } from '../search-query.utility';
import { SEARCH_MAX_QUERY_LENGTH } from '../../constants/search.constants';

/**
 * Research used to be disabled by writing a long message.
 *
 * The run's `intent` was capped at the SEARCH query limit, so a prompt over 500
 * characters 400'd the whole run. chat-service swallowed that to null, produced
 * no transcript and raised no warning, and the model was then told nothing
 * about the web at all — which is the condition that makes it refuse.
 */
describe('clampSearchQuery', () => {
  it('leaves a short query untouched', () => {
    expect(clampSearchQuery('latest AI news')).toEqual({
      query: 'latest AI news',
      truncated: false,
    });
  });

  it('collapses whitespace, because a prompt is not typed like a query', () => {
    expect(clampSearchQuery('  latest   AI\n\nnews  ').query).toBe('latest AI news');
  });

  it('clamps a long prompt instead of letting the run fail', () => {
    const long = 'word '.repeat(400);
    const result = clampSearchQuery(long);

    expect(result.truncated).toBe(true);
    expect(result.query.length).toBeLessThanOrEqual(SEARCH_MAX_QUERY_LENGTH);
  });

  it('cuts on a word boundary, because half a word is a different word', () => {
    const long = `${'alpha '.repeat(120)}extraordinary`;
    const result = clampSearchQuery(long);

    expect(result.query.endsWith(' ')).toBe(false);
    expect(result.query.split(' ').at(-1)).toBe('alpha');
  });

  it('still cuts a run-on with no spaces rather than returning almost nothing', () => {
    const runOn = 'a'.repeat(SEARCH_MAX_QUERY_LENGTH + 200);
    const result = clampSearchQuery(runOn);

    expect(result.query).toHaveLength(SEARCH_MAX_QUERY_LENGTH);
    expect(result.truncated).toBe(true);
  });

  it('reports exactly at the boundary as untruncated', () => {
    const exact = 'a'.repeat(SEARCH_MAX_QUERY_LENGTH);
    expect(clampSearchQuery(exact)).toEqual({ query: exact, truncated: false });
  });
});
