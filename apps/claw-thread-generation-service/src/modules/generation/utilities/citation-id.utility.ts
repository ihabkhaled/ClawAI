import {
  BRACKET_FOLD,
  CJK_BRACKET_PATTERN,
  DECIMAL_DIGIT_PATTERN,
  DIGIT_BLOCK_LENGTH,
  DIGIT_BLOCK_ZEROS,
  ID_WRAPPER_PATTERN,
  INVISIBLE_MARKS_PATTERN,
} from '../constants/citation-markup.constants';

function foldDigit(char: string): string {
  const code = char.codePointAt(0) ?? 0;
  const zero = DIGIT_BLOCK_ZEROS.find(
    (start) => code >= start && code < start + DIGIT_BLOCK_LENGTH,
  );
  return zero === undefined ? char : String(code - zero);
}

/**
 * An evidence id as the model may have mangled it, back to plain text: invisible directional
 * marks removed, full-width and CJK brackets and letters folded to ASCII, local digits turned into
 * ASCII digits, and any wrapper (brackets, quotes, backticks) trimmed. Never invents characters.
 */
export function canonicalCitationText(raw: string): string {
  const folded = raw
    .replaceAll(INVISIBLE_MARKS_PATTERN, '')
    .normalize('NFKC')
    .replaceAll(CJK_BRACKET_PATTERN, (char) => BRACKET_FOLD.get(char) ?? char)
    .replaceAll(DECIMAL_DIGIT_PATTERN, foldDigit);
  return folded.replaceAll(ID_WRAPPER_PATTERN, '');
}

/**
 * The evidence id a model-written reference stands for: the exact id, the id once canonicalised,
 * the same id in another letter case, or the id of the evidence item with that url. Null when it
 * names nothing in the bundle (a real hallucination stays unresolved so the evidence rule refuses it).
 */
export function resolveEvidenceId(
  raw: string,
  evidence: ReadonlyMap<string, string>,
): string | null {
  const text = canonicalCitationText(raw);
  if (evidence.has(text)) return text;
  const lower = text.toLowerCase();
  const sameId = [...evidence.keys()].filter((id) => id.toLowerCase() === lower);
  if (sameId.length === 1) return sameId[0] ?? null;
  const sameUrl = [...evidence].filter(([, url]) => url === text);
  return sameUrl.length === 1 ? (sameUrl[0]?.[0] ?? null) : null;
}
