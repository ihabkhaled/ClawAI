import {
  STEP_EXCERPT_MAX_CHARS,
  STEP_REDACTED_MARK,
  STEP_SECRET_PATTERNS,
  STEP_URL_QUERY_PATTERN,
} from '../constants/step-recorder.constants';

/** Secrets and URL query strings removed; the length is left to the caller. */
export function redactSensitiveText(raw: string): string {
  let text = raw.replace(STEP_URL_QUERY_PATTERN, '$1');
  for (const pattern of STEP_SECRET_PATTERNS) text = text.replace(pattern, STEP_REDACTED_MARK);
  return text;
}

/** Bounded owner-only excerpt: secrets and URL query strings are removed before storage. */
export function toExcerpt(
  raw: string | null | undefined,
  maxChars: number = STEP_EXCERPT_MAX_CHARS,
): string | null {
  const text = raw?.trim() ?? '';
  return text.length === 0 ? null : redactSensitiveText(text).slice(0, maxChars).trim() || null;
}
