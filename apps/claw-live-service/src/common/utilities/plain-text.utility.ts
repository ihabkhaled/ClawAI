import { LINK_PATTERN, MARKUP_PATTERN } from './plain-text.constants';

function tokens(pattern: RegExp, text: string): string[] {
  pattern.lastIndex = 0;
  return [...text.matchAll(pattern)].map((match) => match[0].toLowerCase());
}

/**
 * True when `output` carries a link or markup that `source` does not (ADR-217 rule):
 * a model reply may restate the stream, never inject a destination or HTML into it.
 */
export function introducesLinksOrMarkup(output: string, source: string): boolean {
  const lowerSource = source.toLowerCase();
  const added = [...tokens(LINK_PATTERN, output), ...tokens(MARKUP_PATTERN, output)];
  return added.some((token) => !lowerSource.includes(token));
}
