/**
 * Word matching for context retrieval, in any language. The old tokenizers kept only `[a-z0-9]`, so every Arabic,
 * Hindi, Chinese or Russian word was deleted: memories, older turns and other chats written in them never matched
 * (owner report 2026-11-28).
 */
export const CONTEXT_TOKEN_SPLIT_PATTERN = /[^\p{L}\p{N}\p{M}-]+/gu;
/** Latin-script words, which keep the longer minimum so "the" and "and" never match. */
export const CONTEXT_LATIN_TOKEN_PATTERN = /^[\p{Script=Latin}\p{N}\p{M}-]+$/u;
/** Scripts written without spaces between words: matched by overlapping character pairs. */
export const CONTEXT_UNSPACED_SCRIPT_PATTERN =
  /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Thai}]/u;
/** Arabic vowel marks and the stretching character, which people type or omit freely. */
export const CONTEXT_ARABIC_MARKS_PATTERN = /[\u064B-\u065F\u0670\u0640]/gu;
export const CONTEXT_ARABIC_LETTER_FORMS: ReadonlyArray<readonly [RegExp, string]> = [
  [/[\u0623\u0625\u0622]/gu, '\u0627'],
  [/\u0649/gu, '\u064A'],
  [/\u0629/gu, '\u0647'],
];
/** The Arabic definite article, so «السر» and «سر» match. */
export const CONTEXT_ARABIC_ARTICLE = '\u0627\u0644';
export const CONTEXT_ARABIC_ARTICLE_MIN_LENGTH = 4;
/** The minimum length of a word in a non-Latin script: many meaningful Arabic words are two or three letters. */
export const CONTEXT_NON_LATIN_MIN_LENGTH = 2;
/** Common short words that carry no meaning, in scripts where two letters already count. */
export const CONTEXT_STOP_WORDS: ReadonlySet<string> = new Set([
  'ما',
  'في',
  'من',
  'عن',
  'هو',
  'هي',
  'يا',
  'لا',
  'ان',
  'او',
  'ده',
  'دي',
  'ايه',
  'انا',
  'انت',
  'علي',
  'الي',
  'کی',
  'در',
  'и',
  'в',
  'не',
  'на',
  'что',
  'это',
  'я',
  'с',
  'а',
  'के',
  'में',
  'है',
  'का',
  'की',
  'से',
]);
