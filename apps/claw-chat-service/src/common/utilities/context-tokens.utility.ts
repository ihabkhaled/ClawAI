import {
  CONTEXT_ARABIC_ARTICLE,
  CONTEXT_ARABIC_ARTICLE_MIN_LENGTH,
  CONTEXT_ARABIC_LETTER_FORMS,
  CONTEXT_ARABIC_MARKS_PATTERN,
  CONTEXT_LATIN_TOKEN_PATTERN,
  CONTEXT_NON_LATIN_MIN_LENGTH,
  CONTEXT_STOP_WORDS,
  CONTEXT_TOKEN_SPLIT_PATTERN,
  CONTEXT_UNSPACED_SCRIPT_PATTERN,
} from '../constants/context-tokens.constants';

/** Lower case, with the Arabic spelling variants people mix (marks, alef forms, final ya, ta marbuta) folded. */
function normaliseForMatching(value: string): string {
  const folded = value.normalize('NFKC').toLowerCase().replaceAll(CONTEXT_ARABIC_MARKS_PATTERN, '');
  return CONTEXT_ARABIC_LETTER_FORMS.reduce(
    (text, [pattern, replacement]) => text.replaceAll(pattern, replacement),
    folded,
  );
}

function characterPairs(word: string): string[] {
  const characters = [...word];
  return characters.length < 2
    ? characters
    : characters.slice(1).map((character, index) => `${characters.at(index) ?? ''}${character}`);
}

function expandWord(word: string, minLatinLength: number): string[] {
  if (CONTEXT_UNSPACED_SCRIPT_PATTERN.test(word)) {
    return characterPairs(word);
  }
  if (CONTEXT_LATIN_TOKEN_PATTERN.test(word)) {
    return word.length >= minLatinLength ? [word] : [];
  }
  const bare =
    word.startsWith(CONTEXT_ARABIC_ARTICLE) && word.length >= CONTEXT_ARABIC_ARTICLE_MIN_LENGTH
      ? word.slice(CONTEXT_ARABIC_ARTICLE.length)
      : word;
  return bare.length >= CONTEXT_NON_LATIN_MIN_LENGTH && !CONTEXT_STOP_WORDS.has(bare) ? [bare] : [];
}

/** The words of a text that can meaningfully match another text, in any language. */
export function contextTokens(value: string, minLatinLength: number): string[] {
  return normaliseForMatching(value)
    .split(CONTEXT_TOKEN_SPLIT_PATTERN)
    .filter((word) => word.length > 0)
    .flatMap((word) => expandWord(word, minLatinLength));
}

/**
 * Words for a database substring search, in any language: only the Arabic marks are removed, because the stored text
 * keeps its own letter forms. Chinese, Japanese and Thai runs become character pairs.
 */
export function searchableWords(value: string): string[] {
  return value
    .normalize('NFKC')
    .toLowerCase()
    .replaceAll(CONTEXT_ARABIC_MARKS_PATTERN, '')
    .split(CONTEXT_TOKEN_SPLIT_PATTERN)
    .filter((word) => word.length > 0)
    .flatMap((word) => (CONTEXT_UNSPACED_SCRIPT_PATTERN.test(word) ? characterPairs(word) : [word]))
    .map((word) =>
      word.startsWith(CONTEXT_ARABIC_ARTICLE) && word.length >= CONTEXT_ARABIC_ARTICLE_MIN_LENGTH
        ? word.slice(CONTEXT_ARABIC_ARTICLE.length)
        : word,
    );
}
