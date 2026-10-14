function isControl(code: number): boolean {
  return code < 0x20 || (code >= 0x7f && code <= 0x9f);
}

/** Replaces control characters with a space so they cannot reach SQL text or logs. */
export function stripControlChars(text: string): string {
  let out = '';
  for (const char of text) {
    const code = char.codePointAt(0) ?? 0;
    out += isControl(code) ? ' ' : char;
  }
  return out;
}

/** Escapes LIKE wildcards so user text is matched literally (ESCAPE '\'). */
export function escapeLike(text: string): string {
  return text.replaceAll(/[\\%_]/g, String.raw`\$&`);
}

/** Splits normalised text into its distinct words. */
export function tokenise(normalised: string): string[] {
  return [...new Set(normalised.split(' ').filter((word) => word.length > 0))];
}

/** Rebuilds the query with each misspelt word replaced; null when nothing changed. */
export function applyCorrections(
  tokens: readonly string[],
  corrections: readonly { token: string; word: string }[],
): string | null {
  const byToken = new Map(corrections.map((entry) => [entry.token, entry.word]));
  let changed = false;
  const rebuilt = tokens.map((token) => {
    const word = byToken.get(token);
    if (word && word !== token) {
      changed = true;
      return word;
    }
    return token;
  });
  return changed ? rebuilt.join(' ') : null;
}

/** Length in characters (code points), so one CJK character or emoji counts once. */
export function charCount(text: string): number {
  return [...text].length;
}
