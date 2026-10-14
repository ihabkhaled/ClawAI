/**
 * A topic's minimum weight: a letter or number of an alphabetic script counts 1, a Chinese,
 * Japanese or Korean character counts 2.5, so 10 letters or 4 such characters are enough.
 */
export const TOPIC_MIN_WEIGHT = 10;
export const TOPIC_MIN_DENSE_CHARACTERS = 4;
export const TOPIC_DENSE_WEIGHT = TOPIC_MIN_WEIGHT / TOPIC_MIN_DENSE_CHARACTERS;

export const TOPIC_DENSE_SCRIPT =
  /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]/u;
export const TOPIC_LETTER_OR_NUMBER = /[\p{L}\p{N}]/u;
