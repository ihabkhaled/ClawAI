import {
  ROUTINE_SECRET_REDACTION_MARKER,
  ROUTINE_SECRET_SCRUB_MIN_CHARS,
} from '../constants/routine-secret.constants';

/**
 * Replaces every occurrence of a secret value in a job's reported output. Longest value
 * first, so a value that contains another is removed whole. Values too short to be a
 * credential are left alone. Exact matches only: a job that re-encodes a secret
 * (base64, URL-escaping) is not caught, which the threat model states.
 */
export function scrubSecretValues(text: string, values: readonly string[]): string {
  const ordered = [...new Set(values)]
    .filter((value) => value.length >= ROUTINE_SECRET_SCRUB_MIN_CHARS)
    .sort((a, b) => b.length - a.length);
  return ordered.reduce(
    (current, value) => current.split(value).join(ROUTINE_SECRET_REDACTION_MARKER),
    text,
  );
}
