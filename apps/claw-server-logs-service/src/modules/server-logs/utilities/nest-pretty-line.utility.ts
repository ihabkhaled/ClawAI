import {
  NEST_LEVEL_WORDS,
  NEST_PRETTY_HEAD,
  WHITESPACE_CHARACTER,
} from '../constants/container-log.constants';
import type { NestPrettyParts } from '../types/server-logs.types';

function isBlank(character: string): boolean {
  return WHITESPACE_CHARACTER.test(character);
}

function skipBlanks(text: string, from: number): number {
  let index = from;
  while (isBlank(text.charAt(index))) index += 1;
  return index;
}

/**
 * Reads `[Nest] <pid> - <anything> <LEVEL> [<Context>] <message>` in linear time, with the same
 * result as the regex it replaces, `^\[Nest\]\s+\d+\s+-\s+.*?\s+(LEVEL)\s+\[([^\]]+)\]\s+(.*)$`
 * with the `s` flag (CodeQL js/polynomial-redos: a long run of blanks after the dash cost the square
 * of its length). The level is the first word, after the first run of blanks, that has blanks
 * before it and a valid `[Context] ` after it. Only when none does, a level right after that first
 * run counts, and only if the run is two or more blanks long, which is how the regex backtracked.
 */
export function parseNestPrettyLine(text: string): NestPrettyParts | null {
  const head = NEST_PRETTY_HEAD.exec(text);
  if (head === null) {
    return null;
  }
  const afterDash = head[0].length;
  const firstWord = skipBlanks(text, afterDash);
  if (firstWord === afterDash) {
    return null;
  }
  let closeFrom = Number.POSITIVE_INFINITY;
  let close = -1;
  // The first `]` at or after `from`, reused while the scan only moves forward.
  const closeAfter = (from: number): number => {
    if (from < closeFrom || (close !== -1 && from > close)) {
      closeFrom = from;
      close = text.indexOf(']', from);
    }
    return close;
  };
  const levelAt = (start: number): NestPrettyParts | null => {
    const word = NEST_LEVEL_WORDS.find((candidate) => text.startsWith(candidate, start));
    if (word === undefined) {
      return null;
    }
    const open = skipBlanks(text, start + word.length);
    if (open === start + word.length || text.charAt(open) !== '[') {
      return null;
    }
    const end = closeAfter(open + 1);
    if (end <= open + 1 || !isBlank(text.charAt(end + 1))) {
      return null;
    }
    const message = text.slice(skipBlanks(text, end + 1));
    return { word, context: text.slice(open + 1, end), message };
  };
  for (let start = firstWord + 1; start < text.length; start += 1) {
    if (isBlank(text.charAt(start - 1)) && !isBlank(text.charAt(start))) {
      const parts = levelAt(start);
      if (parts !== null) {
        return parts;
      }
    }
  }
  return firstWord - afterDash > 1 ? levelAt(firstWord) : null;
}
