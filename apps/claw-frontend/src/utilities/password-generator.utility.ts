import {
  PASSWORD_GENERATOR_DIGITS,
  PASSWORD_GENERATOR_LENGTH,
  PASSWORD_GENERATOR_LOWERCASE,
  PASSWORD_GENERATOR_SYMBOLS,
  PASSWORD_GENERATOR_UPPERCASE,
} from '@/constants/password-generator.constants';

const CLASSES = [
  PASSWORD_GENERATOR_UPPERCASE,
  PASSWORD_GENERATOR_LOWERCASE,
  PASSWORD_GENERATOR_DIGITS,
  PASSWORD_GENERATOR_SYMBOLS,
];

const ALPHABET = CLASSES.join('');

/**
 * Draws an unbiased index below `bound`.
 *
 * `getRandomValues() % bound` is biased whenever `bound` does not divide 2^32,
 * which is every alphabet here. Rejection sampling costs an occasional extra
 * draw and removes the skew — cheap insurance on a value that becomes a
 * credential.
 */
function randomIndexBelow(bound: number): number {
  const limit = Math.floor(0xffffffff / bound) * bound;
  const buffer = new Uint32Array(1);
  let value = 0;
  do {
    crypto.getRandomValues(buffer);
    value = buffer[0] ?? 0;
  } while (value >= limit);
  return value % bound;
}

function pickFrom(source: string): string {
  return source[randomIndexBelow(source.length)] ?? '';
}

/** Fisher-Yates, so the guaranteed class picks do not always land in front. */
function shuffle(characters: string[]): string[] {
  const shuffled = [...characters];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swap = randomIndexBelow(index + 1);
    const held = shuffled[index] as string;
    shuffled[index] = shuffled[swap] as string;
    shuffled[swap] = held;
  }
  return shuffled;
}

/**
 * Generates a password that satisfies the admin create-user policy on the first
 * try — at least one uppercase, lowercase, digit and symbol.
 *
 * Generating uniformly and re-rolling until it happens to pass is the usual
 * shortcut and it is worse in both directions: it is slower, and a failed roll
 * that reaches the user as a validation error on a *generated* password reads as
 * a bug in the product.
 */
export function generatePassword(length: number = PASSWORD_GENERATOR_LENGTH): string {
  const required = CLASSES.map(pickFrom);
  const fillCount = Math.max(0, length - required.length);
  const filler = Array.from({ length: fillCount }, () => pickFrom(ALPHABET));

  return shuffle([...required, ...filler]).join('');
}
