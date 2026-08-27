/**
 * What the search panel should be showing.
 *
 * A single state rather than three nested conditions in the panel: the four
 * cases are mutually exclusive, and expressing them as an enum keeps the
 * decision out of the TSX and makes it testable.
 */
export enum ThreadSearchState {
  /** The term is too short to search on. */
  TooShort = 'TOO_SHORT',
  Searching = 'SEARCHING',
  NoMatches = 'NO_MATCHES',
  HasMatches = 'HAS_MATCHES',
}
