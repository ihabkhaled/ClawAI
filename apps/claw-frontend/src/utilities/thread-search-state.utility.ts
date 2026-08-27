import { ThreadSearchState } from '@/enums/thread-search-state.enum';
import type { UseInThreadSearchReturn } from '@/types';

/**
 * Which of the four mutually exclusive states the search panel is in.
 *
 * Order matters: "too short" outranks "searching", because a query is not in
 * flight below the minimum length, and "searching" outranks "no matches",
 * because an in-flight query has not yet failed to find anything — showing
 * "no matches" while still looking is the flicker this ordering prevents.
 */
export function resolveThreadSearchState(
  search: Pick<UseInThreadSearchReturn, 'isSearchable' | 'isSearching' | 'matches'>,
): ThreadSearchState {
  if (!search.isSearchable) {
    return ThreadSearchState.TooShort;
  }
  if (search.isSearching) {
    return ThreadSearchState.Searching;
  }
  return search.matches.length === 0 ? ThreadSearchState.NoMatches : ThreadSearchState.HasMatches;
}
