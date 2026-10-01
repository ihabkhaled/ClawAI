// Removes every control character (NUL included) by code point, so none is ever
// embedded in this source file. Newline and tab survive only when asked for —
// a name or an email has no business holding either.
export function stripControlCharacters(value: string, keepLineBreaks: boolean): string {
  let output = '';
  for (const character of value) {
    const code = character.codePointAt(0) ?? 0;
    const isLineBreak = character === '\n' || character === '\r' || character === '\t';
    const isControl = code < 32 || (code >= 127 && code <= 159);
    if (!isControl || (keepLineBreaks && isLineBreak)) {
      output += character;
    }
  }
  return output;
}

// One line, single spaces, no control characters: for names and titles.
export function cleanSingleLine(value: string): string {
  return stripControlCharacters(value.normalize('NFC'), true).replaceAll(/\s+/g, ' ').trim();
}

export function cleanMultiLine(value: string): string {
  return stripControlCharacters(value.normalize('NFC'), true).trim();
}

export function cleanEmail(value: string): string {
  return stripControlCharacters(value, false).trim().toLowerCase();
}

// A title falls back to the first words of the message when the form left it blank.
export function deriveTitle(message: string, maxLength: number): string {
  const firstLine = cleanSingleLine(message);
  return firstLine.length <= maxLength ? firstLine : `${firstLine.slice(0, maxLength - 1)}…`;
}
