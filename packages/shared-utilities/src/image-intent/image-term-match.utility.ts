import {
  IMAGE_INTENT_EXPLICIT_NOUNS,
  IMAGE_INTENT_EXPLICIT_WINDOW,
  IMAGE_INTENT_FIGURATIVE_OBJECTS,
  IMAGE_INTENT_FIGURATIVE_WINDOW,
  IMAGE_INTENT_MAKE_VERBS,
  IMAGE_INTENT_PICTURE_VERB_FOLLOWERS,
  IMAGE_INTENT_PICTURE_VERBS,
  IMAGE_INTENT_SUPPLEMENT_OPENERS,
  IMAGE_INTENT_WRITING_VERBS,
  IMAGE_INTENT_WRITTEN_DELIVERABLES,
  IMAGE_TERM_LATIN_START,
  IMAGE_TERM_LEFT_BOUNDARY,
  IMAGE_TERM_RIGHT_BOUNDARY,
  IMAGE_TERM_SUFFIX_LIST,
  IMAGE_TERM_SUFFIXES,
} from './image-intent.constants';

const WORD_TOKEN = /[\p{L}\p{N}']+/gu;

function escapeRegExp(term: string): string {
  return term.replaceAll(/[|\\{}()[\]^$+*?.]/gu, String.raw`\$&`);
}

/** Lowercase, single-spaced: phrases match across newlines and double spaces. */
export function normaliseImageText(text: string): string {
  return text.toLowerCase().replaceAll(/\s+/gu, ' ').trim();
}

/**
 * Whether `lower` contains any term as a WHOLE word or phrase (with a plural /
 * -ed / -ing tail). A term that ends in a space ("photo ") keeps that space and
 * is boundary-checked on the left only; a term in another script (Arabic,
 * Chinese) stays a plain substring because those scripts have no spaces.
 */
export function containsAnyImageTerm(lower: string, terms: readonly string[]): boolean {
  const latin = terms.filter((term) => IMAGE_TERM_LATIN_START.test(term));
  if (terms.some((term) => !IMAGE_TERM_LATIN_START.test(term) && lower.includes(term))) {
    return true;
  }
  const bare = latin.filter((term) => !term.endsWith(' ')).map(escapeRegExp);
  const spaced = latin.filter((term) => term.endsWith(' ')).map(escapeRegExp);
  const bareHit =
    bare.length > 0 &&
    new RegExp(
      `${IMAGE_TERM_LEFT_BOUNDARY}(?:${bare.join('|')})${IMAGE_TERM_SUFFIXES}${IMAGE_TERM_RIGHT_BOUNDARY}`,
      'u',
    ).test(lower);
  return (
    bareHit ||
    (spaced.length > 0 &&
      new RegExp(`${IMAGE_TERM_LEFT_BOUNDARY}(?:${spaced.join('|')})`, 'u').test(lower))
  );
}

/** The words of a lowercase message, in order. */
export function imageTextTokens(lower: string): string[] {
  return lower.match(WORD_TOKEN) ?? [];
}

function tokenIsTerm(token: string, term: string): boolean {
  return (
    token === term ||
    (token.startsWith(term) && IMAGE_TERM_SUFFIX_LIST.includes(token.slice(term.length)))
  );
}

function tokenIndexes(tokens: readonly string[], terms: readonly string[]): number[] {
  const indexes: number[] = [];
  for (const [index, token] of tokens.entries()) {
    if (terms.some((term) => tokenIsTerm(token, term))) indexes.push(index);
  }
  return indexes;
}

/** True when a verb and an image word sit within `window` words of each other. */
export function hasTermPairWithin(
  lower: string,
  verbs: readonly string[],
  words: readonly string[],
  window: number,
): boolean {
  const tokens = imageTextTokens(lower);
  const verbAt = tokenIndexes(tokens, verbs);
  const wordAt = tokenIndexes(tokens, words);
  return verbAt.some((v) => wordAt.some((w) => v !== w && Math.abs(v - w) <= window));
}

/**
 * An unmistakable request for a picture: "draw a cat", "create an image",
 * "make me a logo" — a picture verb with a determiner after it, or a make-verb
 * followed by an image noun within a few words. Everything looser (an image
 * word anywhere, an art style, "poster ") is only a hint, and a hint is not
 * enough inside a writing task or a supplementary note.
 */
export function isExplicitImageRequest(lower: string): boolean {
  const tokens = imageTextTokens(lower);
  const pictureVerbHit = tokenIndexes(tokens, IMAGE_INTENT_PICTURE_VERBS).some((index) => {
    const follower = tokens[index + 1];
    if (follower === undefined || !IMAGE_INTENT_PICTURE_VERB_FOLLOWERS.includes(follower)) {
      return false;
    }
    const after = tokens.slice(index + 2, index + 1 + IMAGE_INTENT_FIGURATIVE_WINDOW);
    return !after.some((word) => IMAGE_INTENT_FIGURATIVE_OBJECTS.includes(word));
  });
  return (
    pictureVerbHit ||
    tokenIndexes(tokens, IMAGE_INTENT_MAKE_VERBS).some((verb) =>
      tokens
        .slice(verb + 1, verb + 2 + IMAGE_INTENT_EXPLICIT_WINDOW)
        .some((word) => IMAGE_INTENT_EXPLICIT_NOUNS.some((noun) => tokenIsTerm(word, noun))),
    )
  );
}

/**
 * Text that carries material for a task rather than a request of its own: a
 * supplementary note ("say also …", "additional context: …") or a writing job
 * ("write a LinkedIn post about our logo"). Image nouns in it are topic words.
 */
export function isSupplementOrWritingText(lower: string): boolean {
  return (
    IMAGE_INTENT_SUPPLEMENT_OPENERS.some((opener) => opener.test(lower)) ||
    (IMAGE_INTENT_WRITING_VERBS.test(lower) && IMAGE_INTENT_WRITTEN_DELIVERABLES.test(lower))
  );
}
