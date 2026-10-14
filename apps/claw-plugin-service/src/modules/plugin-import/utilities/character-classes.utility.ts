import {
  C0_LAST,
  C1_LAST,
  DELETE_CODE,
  TAB_LINE_FEED_CARRIAGE_RETURN,
} from '../constants/plugin-import.constants';

/** NUL, the other C0 controls, DEL and the C1 controls. Tab, line feed and carriage return are not counted. */
export function isControlCodePoint(code: number): boolean {
  const inControlRange = code <= C0_LAST || (code >= DELETE_CODE && code <= C1_LAST);
  return inControlRange && !TAB_LINE_FEED_CARRIAGE_RETURN.has(code);
}

/** Bidi overrides and isolates, zero-width characters and the byte-order mark: they reorder or hide text. */
export function isInvisibleFormatCodePoint(code: number): boolean {
  return (
    (code >= 0x20_0b && code <= 0x20_0f) ||
    (code >= 0x20_2a && code <= 0x20_2e) ||
    (code >= 0x20_66 && code <= 0x20_69) ||
    code === 0xfe_ff
  );
}

export function containsControlOrInvisible(text: string): boolean {
  for (const char of text) {
    const code = char.codePointAt(0) ?? 0;
    if (isControlCodePoint(code) || isInvisibleFormatCodePoint(code)) return true;
  }
  return false;
}

/** Text with control and invisible-format characters removed (letters, RTL text and emoji stay). */
export function stripControlAndInvisible(text: string): string {
  let result = '';
  for (const char of text) {
    const code = char.codePointAt(0) ?? 0;
    if (!isControlCodePoint(code) && !isInvisibleFormatCodePoint(code)) result += char;
  }
  return result;
}

export function containsWhitespaceOrControl(text: string): boolean {
  for (const char of text) {
    const code = char.codePointAt(0) ?? 0;
    if (code <= 0x20 || isControlCodePoint(code) || /\s/.test(char)) return true;
  }
  return false;
}
