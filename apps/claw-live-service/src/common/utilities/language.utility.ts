import {
  LANGUAGE_NAME_TO_CODE,
  LETTER_PATTERN,
  SCRIPT_LANGUAGE_MIN_SHARE,
  SCRIPT_LANGUAGE_RULES,
  SCRIPT_LANGUAGES,
  SCRIPT_MARKER_LANGUAGES,
  SCRIPT_MARKER_MIN_LETTERS,
} from './language.constants';

/**
 * Base language code (`en`, `ar`) of a BCP-47 tag or a provider's language name;
 * null when it cannot be told. `pt-BR` → `pt`, `English` → `en`.
 */
export function baseLanguage(value: string | null | undefined): string | null {
  if (!value) return null;
  const lower = value.trim().toLowerCase();
  const primary = lower.split(/[-_]/u)[0] ?? '';
  return /^[a-z]{2,3}$/u.test(primary) && lower.length <= 15
    ? primary
    : (new Map(Object.entries(LANGUAGE_NAME_TO_CODE)).get(lower) ?? null);
}

function countMatches(text: string, pattern: RegExp): number {
  return text.match(pattern)?.length ?? 0;
}

/**
 * The language a line's writing system names (`مرحبا` → `ar`, `Привет` → `ru`), or null for Latin
 * script and mixed text: Latin is shared by too many languages to guess from.
 */
export function scriptLanguage(text: string): string | null {
  const letters = countMatches(text, LETTER_PATTERN);
  if (letters === 0) return null;
  for (const rule of SCRIPT_LANGUAGE_RULES) {
    const hits = countMatches(text, rule.pattern);
    if (
      SCRIPT_MARKER_LANGUAGES.has(rule.language)
        ? hits >= SCRIPT_MARKER_MIN_LETTERS
        : hits / letters >= SCRIPT_LANGUAGE_MIN_SHARE
    ) {
      return rule.language;
    }
  }
  return null;
}

/**
 * The spoken language of one caption: the speech model's own answer, else its script, else the
 * run's last known language when this line could be that language (a Latin line never inherits a
 * script language such as Arabic). Null means "not known", and the caption is translated for every
 * viewer, as before.
 */
export function resolveSpokenLanguage(
  reported: string | null | undefined,
  text: string,
  previous: string | null,
): string | null {
  const known = baseLanguage(reported) ?? scriptLanguage(text);
  if (known !== null) return known;
  return previous !== null && !SCRIPT_LANGUAGES.has(previous) ? previous : null;
}
