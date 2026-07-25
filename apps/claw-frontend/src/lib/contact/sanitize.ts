// Injection defences for contact submissions.
//
// - Email headers (Subject, From display name, Reply-To) must never contain
//   CR/LF: a newline lets an attacker inject extra headers (BCC, etc.). We
//   strip all control characters and collapse whitespace.
// - The HTML body is fully escaped so a message body can never inject markup.
// - Log values are stripped of newlines so a crafted message can't forge
//   extra log lines (log injection / log forging).
//
// Control characters are filtered by code point (not a regex) to keep the
// source free of literal control bytes and to sidestep no-control-regex.

function isControlCodePoint(code: number): boolean {
  // C0 controls (incl. CR, LF, TAB) and DEL.
  return code < 0x20 || code === 0x7f;
}

function stripControlChars(value: string, options: { keepNewlines: boolean }): string {
  let result = '';
  for (const char of value) {
    const code = char.codePointAt(0) ?? 0;
    if (options.keepNewlines && char === '\n') {
      result += char;
      continue;
    }
    if (isControlCodePoint(code)) {
      result += options.keepNewlines ? '' : ' ';
      continue;
    }
    result += char;
  }
  return result;
}

// Removes CR/LF and other control characters and trims. Use for any value
// that ends up in an email header.
export function sanitizeHeaderValue(value: string): string {
  return stripControlChars(value, { keepNewlines: false })
    .replaceAll(/\s{2,}/gu, ' ')
    .trim();
}

const HTML_ESCAPE_MAP: Readonly<Record<string, string>> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
  '/': '&#x2F;',
};

// Escapes a string for safe interpolation into an HTML email body.
export function escapeHtml(value: string): string {
  return value.replaceAll(/[&<>"'/]/gu, (char) => HTML_ESCAPE_MAP[char] ?? char);
}

// Collapses newlines/control chars for safe single-line logging.
export function sanitizeForLog(value: string): string {
  return stripControlChars(value, { keepNewlines: false })
    .replaceAll(/\s{2,}/gu, ' ')
    .trim()
    .slice(0, 300);
}

// Preserves paragraph newlines for the plain-text body while removing the
// bare-CR and other control characters. Newlines are legal in a body (not a
// header), so \n is kept.
export function sanitizeMultilineBody(value: string): string {
  return stripControlChars(value, { keepNewlines: true });
}
