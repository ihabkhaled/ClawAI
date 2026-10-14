import {
  JSON_BACKSLASH,
  JSON_FIRST_PRINTABLE_CODE,
  JSON_QUOTE,
  JSON_WHITESPACE_PATTERN,
} from '../constants/generation.constants';

/** True when the next non-space character after `index` closes an object or an array. */
function closesNext(text: string, index: number): boolean {
  let cursor = index + 1;
  while (cursor < text.length && JSON_WHITESPACE_PATTERN.test(text.charAt(cursor))) cursor += 1;
  return text.charAt(cursor) === '}' || text.charAt(cursor) === ']';
}

/** The JSON escape for one control character (a line break becomes backslash-n and so on). */
function escapeControl(char: string): string {
  return JSON.stringify(char).slice(1, -1);
}

/**
 * Repairs the two slips that make an otherwise complete model answer unparseable: a raw line
 * break or tab inside a string (long markdown written as it reads) and a comma before a closing
 * brace or bracket. Nothing else changes, so a truncated or wrong-shaped answer stays refused.
 */
export function repairJsonText(text: string): string {
  let result = '';
  let inString = false;
  let escaped = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text.charAt(index);
    if (!inString) {
      if (char === ',' && closesNext(text, index)) continue;
      if (char === JSON_QUOTE) inString = true;
      result += char;
    } else if (escaped) {
      escaped = false;
      result += char;
    } else if (char === JSON_BACKSLASH) {
      escaped = true;
      result += char;
    } else if (char === JSON_QUOTE) {
      inString = false;
      result += char;
    } else {
      result += char.charCodeAt(0) < JSON_FIRST_PRINTABLE_CODE ? escapeControl(char) : char;
    }
  }
  return result;
}
