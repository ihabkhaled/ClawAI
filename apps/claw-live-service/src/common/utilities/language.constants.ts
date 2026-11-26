/** Language names some STT providers report instead of a code, mapped to ISO 639-1. */
export const LANGUAGE_NAME_TO_CODE: Readonly<Record<string, string>> = {
  arabic: 'ar',
  chinese: 'zh',
  dutch: 'nl',
  english: 'en',
  french: 'fr',
  german: 'de',
  hindi: 'hi',
  italian: 'it',
  japanese: 'ja',
  korean: 'ko',
  persian: 'fa',
  portuguese: 'pt',
  russian: 'ru',
  spanish: 'es',
  turkish: 'tr',
};

/**
 * Writing systems that name their language well enough to caption by (2026-11-24). Used only when
 * the speech model reported no language. Checked in order; the first script that holds most of the
 * letters wins. Arabic-script Persian and Urdu are told apart by their own letters first.
 */
export const SCRIPT_LANGUAGE_RULES: ReadonlyArray<{ language: string; pattern: RegExp }> = [
  { language: 'fa', pattern: /[پچژگ]/gu },
  { language: 'ur', pattern: /[ٹڈڑںے]/gu },
  { language: 'ar', pattern: /\p{Script=Arabic}/gu },
  { language: 'he', pattern: /\p{Script=Hebrew}/gu },
  { language: 'uk', pattern: /[іїєґ]/giu },
  { language: 'ru', pattern: /\p{Script=Cyrillic}/gu },
  { language: 'el', pattern: /\p{Script=Greek}/gu },
  { language: 'hi', pattern: /\p{Script=Devanagari}/gu },
  { language: 'bn', pattern: /\p{Script=Bengali}/gu },
  { language: 'ta', pattern: /\p{Script=Tamil}/gu },
  { language: 'te', pattern: /\p{Script=Telugu}/gu },
  { language: 'th', pattern: /\p{Script=Thai}/gu },
  { language: 'ko', pattern: /\p{Script=Hangul}/gu },
  { language: 'ja', pattern: /[\p{Script=Hiragana}\p{Script=Katakana}]/gu },
  { language: 'zh', pattern: /\p{Script=Han}/gu },
  { language: 'ka', pattern: /\p{Script=Georgian}/gu },
  { language: 'hy', pattern: /\p{Script=Armenian}/gu },
  { language: 'am', pattern: /\p{Script=Ethiopic}/gu },
];

/** Every letter, for the share a script must hold. */
export const LETTER_PATTERN = /\p{L}/gu;

/** A script names the language only when it holds at least this share of the letters. */
export const SCRIPT_LANGUAGE_MIN_SHARE = 0.4;

/** Distinct letters a Persian/Urdu/Ukrainian marker needs before it overrides the wider script. */
export const SCRIPT_MARKER_MIN_LETTERS = 1;

/** Languages found by a few letters of their own rather than by a share of the whole line. */
export const SCRIPT_MARKER_LANGUAGES: ReadonlySet<string> = new Set(['fa', 'ur', 'uk']);

/** Script languages that a Latin-script line can never belong to. */
export const SCRIPT_LANGUAGES: ReadonlySet<string> = new Set(
  SCRIPT_LANGUAGE_RULES.map((rule) => rule.language),
);

/**
 * Script languages whose translation must come back in exactly their own script (a Russian target
 * answered in Ukrainian-looking Cyrillic still passes; an Arabic target answered in Persian does not
 * need to fail, so Arabic-script languages are not strict).
 */
export const SCRIPT_LANGUAGES_STRICT: ReadonlySet<string> = new Set([
  'ja',
  'zh',
  'ko',
  'th',
  'hi',
  'el',
  'he',
]);
