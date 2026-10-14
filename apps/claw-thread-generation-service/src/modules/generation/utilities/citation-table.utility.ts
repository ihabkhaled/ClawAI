import {
  CITATION_TABLE_LEAD,
  CITATION_TABLE_MAX_ITEMS,
} from '../constants/author-prompt.constants';

/**
 * The evidence ids and urls the author may cite, one per line, so a model copies the pair instead
 * of guessing an id or a number. It is only a reminder: the evidence rule still decides.
 */
export function citationTable(evidence: ReadonlyMap<string, string>): string {
  const lines = [...evidence]
    .slice(0, CITATION_TABLE_MAX_ITEMS)
    .map(([id, url]) => `- ${id} ${url}`);
  return lines.length === 0 ? '' : `\n${CITATION_TABLE_LEAD}\n${lines.join('\n')}`;
}
