import { HOSTILE_CODE_POINT_RANGES, LINE_BREAK_CODE_POINTS } from '../constants/catalog.constants';

function isHostileCodePoint(codePoint: number): boolean {
  return HOSTILE_CODE_POINT_RANGES.some(([from, to]) => codePoint >= from && codePoint <= to);
}

/**
 * True when the text carries control characters, zero-width characters, bidi
 * overrides or other invisible code points. Tab and newline are allowed only
 * when `allowLineBreaks` is set, so a title stays one line.
 */
export function containsHostileText(text: string, allowLineBreaks: boolean): boolean {
  for (const char of text) {
    const codePoint = char.codePointAt(0) ?? 0;
    if (LINE_BREAK_CODE_POINTS.includes(codePoint)) {
      if (!allowLineBreaks || codePoint === 0x2028 || codePoint === 0x2029) return true;
      continue;
    }
    if (isHostileCodePoint(codePoint)) return true;
  }
  return false;
}
