import {
  STEP_EXCERPT_MAX_CHARS,
  STEP_REDACTED_MARK,
  STEP_SECRET_PATTERNS,
  STEP_URL_QUERY_PATTERN,
} from '../constants/step-recorder.constants';

/** Bounded owner-only excerpt: secrets and URL query strings are removed before storage. */
export function toExcerpt(raw: string | null | undefined): string | null {
  if (!raw) return null;
  let text = raw.trim();
  if (text.length === 0) return null;
  text = text.replace(STEP_URL_QUERY_PATTERN, '$1');
  for (const pattern of STEP_SECRET_PATTERNS) text = text.replace(pattern, STEP_REDACTED_MARK);
  return text.slice(0, STEP_EXCERPT_MAX_CHARS).trim() || null;
}
