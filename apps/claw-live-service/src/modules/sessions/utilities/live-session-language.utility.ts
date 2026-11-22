import { LIVE_SESSION_LANGUAGES } from '../constants/live-session.constants';

/** The allowlisted spelling of a BCP-47 tag (case-insensitive, `_` accepted), or null. */
export function canonicalLanguage(value: string): string | null {
  const wanted = value.trim().replaceAll('_', '-').toLowerCase();
  return LIVE_SESSION_LANGUAGES.find((language) => language.toLowerCase() === wanted) ?? null;
}
