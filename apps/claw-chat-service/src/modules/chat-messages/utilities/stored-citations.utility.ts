import {
  BRACKET_CITATION_LIST_PATTERN,
  CITATION_CODE_SEGMENT_PATTERN,
  CITATION_MAX_COUNT,
  CITATION_MAX_SNIPPET_CHARS,
  CITATION_MAX_TITLE_CHARS,
  LENTICULAR_CITATION_MAX_NUMBERS,
  LENTICULAR_CITATION_NUMBER_PATTERN,
  LENTICULAR_CITATION_PATTERN,
  LENTICULAR_CITATION_REFERENCE_MARK,
  LENTICULAR_CITATION_SEPARATOR,
} from '../constants/message-citations.constants';
import type { StoredCitation } from '../types/message-citation.types';
import type { ResearchEvidenceCitation } from '../types/context.types';

/**
 * `【n】` marks and `[2, 4]` lists rewritten as `[n]`, the only form the UI links. A mark is rewritten only when every
 * number in it names a source the model was shown (1..`sourceCount`); code and anything else is left as written.
 */
export function normaliseCitationMarkers(content: string, sourceCount: number): string {
  if (sourceCount <= 0) {
    return content;
  }
  const relink = (mark: string, inner: string): string => {
    const numbers = citationNumbers(inner, sourceCount);
    return numbers === null ? mark : numbers.map((number) => `[${String(number)}]`).join('');
  };
  // Split with a capturing group: odd positions are the code segments, kept byte for byte.
  return content
    .split(CITATION_CODE_SEGMENT_PATTERN)
    .map((segment, position) =>
      position % 2 === 1
        ? segment
        : segment
            .replace(LENTICULAR_CITATION_PATTERN, relink)
            .replace(BRACKET_CITATION_LIST_PATTERN, relink),
    )
    .join('');
}

/** The source numbers inside one `【…】`, or null when it is not a citation of sources the model was shown. */
function citationNumbers(inner: string, sourceCount: number): number[] | null {
  const [list = ''] = inner.split(LENTICULAR_CITATION_REFERENCE_MARK);
  const entries = list.split(LENTICULAR_CITATION_SEPARATOR).map((entry) => entry.trim());
  const valid =
    entries.length <= LENTICULAR_CITATION_MAX_NUMBERS &&
    entries.every((entry) => LENTICULAR_CITATION_NUMBER_PATTERN.test(entry));
  const numbers = entries.map(Number);
  return valid && numbers.every((number) => number >= 1 && number <= sourceCount) ? numbers : null;
}

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
