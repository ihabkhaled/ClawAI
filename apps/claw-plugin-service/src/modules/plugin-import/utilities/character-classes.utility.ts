import {
  C0_LAST,
  C1_LAST,
  DELETE_CODE,
  JOINER_SCRIPTS,
  TAB_LINE_FEED_CARRIAGE_RETURN,
  ZERO_WIDTH_JOINER,
  ZERO_WIDTH_NON_JOINER,
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

/** ZWNJ / ZWJ shape Persian, Arabic, Indic text and emoji sequences: kept only right after such a character. */
function isMeaningfulJoiner(code: number, previous: string): boolean {
  return (
    (code === ZERO_WIDTH_NON_JOINER || code === ZERO_WIDTH_JOINER) && JOINER_SCRIPTS.test(previous)
  );
}

/**
 * Text with control and invisible-format characters removed (letters, RTL text and emoji stay).
 * Bidi overrides and isolates, zero-width spaces, directional marks and the BOM always go; ZWNJ and
 * ZWJ stay when they follow an Arabic-script, Indic-script or emoji character.
 */
export function stripControlAndInvisible(text: string): string {
  let result = '';
  let previous = '';
  for (const char of text) {
    const code = char.codePointAt(0) ?? 0;
    const keep =
      isMeaningfulJoiner(code, previous) ||
      (!isControlCodePoint(code) && !isInvisibleFormatCodePoint(code));
    if (keep) result += char;
    previous = char;
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
