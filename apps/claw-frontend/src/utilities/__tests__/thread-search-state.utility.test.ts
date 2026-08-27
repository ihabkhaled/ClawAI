import { describe, expect, it } from 'vitest';

import { ThreadSearchState } from '@/enums/thread-search-state.enum';
import { resolveThreadSearchState } from '@/utilities/thread-search-state.utility';

describe('resolveThreadSearchState', () => {
  it('reports a too-short term before anything else', () => {
    // No query is in flight below the minimum length, so "searching" would be
    // a lie even when the flag happens to be set.
    expect(resolveThreadSearchState({ isSearchable: false, isSearching: true, matches: [] })).toBe(
      ThreadSearchState.TooShort,
    );
  });

  it('reports searching before no-matches, so the panel does not flicker', () => {
    // An in-flight query has not yet failed to find anything. Showing
    // "no matches" while still looking is the flicker this ordering prevents.
    expect(resolveThreadSearchState({ isSearchable: true, isSearching: true, matches: [] })).toBe(
      ThreadSearchState.Searching,
    );
  });

  it('reports no matches once the search has settled empty', () => {
    expect(resolveThreadSearchState({ isSearchable: true, isSearching: false, matches: [] })).toBe(
      ThreadSearchState.NoMatches,
    );
  });

  it('reports matches when there are some', () => {
    expect(
      resolveThreadSearchState({
        isSearchable: true,
        isSearching: false,
        matches: [{ messageId: 'm1', role: 'USER', snippet: '…x…', createdAt: 'now' }],
      } as Parameters<typeof resolveThreadSearchState>[0]),
    ).toBe(ThreadSearchState.HasMatches);
  });
});
