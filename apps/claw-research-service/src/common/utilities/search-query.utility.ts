import { SEARCH_MAX_QUERY_LENGTH } from '../constants/search.constants';

/**
 * The search query derived from a user's intent.
 *
 * A provider takes a query; a person writes a prompt. Sending the prompt
 * verbatim used to 400 the entire run once it passed 500 characters — which
 * meant research was silently disabled by writing a long message, with no
 * transcript and no warning to say so.
 *
 * Clamping is done on a word boundary where one is available, because cutting
 * mid-word changes the last term into a different term.
 */
export function clampSearchQuery(intent: string): { query: string; truncated: boolean } {
  const collapsed = intent.trim().replaceAll(/\s+/gu, ' ');
  if (collapsed.length <= SEARCH_MAX_QUERY_LENGTH) {
    return { query: collapsed, truncated: false };
  }
  const hardCut = collapsed.slice(0, SEARCH_MAX_QUERY_LENGTH);
  const lastSpace = hardCut.lastIndexOf(' ');
  // Only prefer the word boundary when it does not throw away most of the
  // budget — a 500-character run-on with no spaces should still be cut.
  const query = lastSpace > SEARCH_MAX_QUERY_LENGTH / 2 ? hardCut.slice(0, lastSpace) : hardCut;
  return { query: query.trimEnd(), truncated: true };
}
