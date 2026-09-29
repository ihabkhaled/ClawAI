import {
  CITATION_MAX_COUNT,
  CITATION_MAX_SNIPPET_CHARS,
  CITATION_MAX_TITLE_CHARS,
} from '../constants/message-citations.constants';
import type { StoredCitation } from '../types/message-citation.types';
import type { ResearchEvidenceCitation } from '../types/context.types';

/**
 * The research evidence as the prompt numbered it (`formatResearchBlock`
 * prints `[index + 1]`), bounded for storage. Order and numbering are the
 * contract: the frontend links an answer's `[n]` ONLY through this list, so a
 * number that was never shown to the model can never become a link.
 */
export function toStoredCitations(
  evidence: readonly ResearchEvidenceCitation[] | undefined,
): StoredCitation[] {
  // Absent on contexts built without research (and in partial test doubles).
  return (evidence ?? []).slice(0, CITATION_MAX_COUNT).map((item, position) => ({
    index: position + 1,
    title: item.title === null ? null : item.title.slice(0, CITATION_MAX_TITLE_CHARS),
    url: item.url,
    snippet: item.snippet.slice(0, CITATION_MAX_SNIPPET_CHARS),
  }));
}
