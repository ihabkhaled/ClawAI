import { SEARCH_SNIPPET_RADIUS } from '../constants/in-thread-search.constants';

/**
 * A preview of the text around a match.
 *
 * Cuts on the match rather than taking the first N characters, because the
 * first N characters of a long message usually do not contain the term the user
 * searched for — which makes every result look identical.
 *
 * Cuts are marked with an ellipsis so a reader can tell the message continues.
 */
export function buildSearchSnippet(content: string, term: string): string {
  const index = content.toLowerCase().indexOf(term.toLowerCase());
  if (index === -1) {
    // The row matched in the database but not here — possible with collation
    // differences. Fall back to the opening rather than returning nothing.
    return content.length <= SEARCH_SNIPPET_RADIUS * 2
      ? content
      : `${content.slice(0, SEARCH_SNIPPET_RADIUS * 2)}…`;
  }

  const start = Math.max(0, index - SEARCH_SNIPPET_RADIUS);
  const end = Math.min(content.length, index + term.length + SEARCH_SNIPPET_RADIUS);
  const prefix = start > 0 ? '…' : '';
  const suffix = end < content.length ? '…' : '';

  return `${prefix}${content.slice(start, end).trim()}${suffix}`;
}
