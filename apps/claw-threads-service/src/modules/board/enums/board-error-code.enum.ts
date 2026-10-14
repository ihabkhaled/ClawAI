/**
 * Machine codes the Board API returns for a refused search text. The frontend branches on these;
 * the message next to each one is plain English for people.
 */
export enum BoardErrorCode {
  /** The search text holds a character that cannot be stored or searched (NUL). */
  QUERY_INVALID = 'BOARD_QUERY_INVALID',
  /** The search text is longer than the maximum. */
  QUERY_TOO_LONG = 'BOARD_QUERY_TOO_LONG',
  /** The search text is empty, or shorter than suggestions need. */
  QUERY_TOO_SHORT = 'BOARD_QUERY_TOO_SHORT',
  /** The page number is above the maximum the Board accepts. */
  PAGE_OUT_OF_RANGE = 'BOARD_PAGE_OUT_OF_RANGE',
}
