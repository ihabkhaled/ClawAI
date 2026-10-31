import { randomInt } from 'node:crypto';
import {
  GENERATED_PASSWORD_LENGTH,
  PASSWORD_DIGITS,
  PASSWORD_LOWER,
  PASSWORD_SYMBOLS,
  PASSWORD_UPPER,
} from '../constants/user-admin.constants';

function pick(alphabet: string): string {
  return alphabet.charAt(randomInt(alphabet.length));
}

/**
 * A strong random password: 20 characters from the OS CSPRNG with at least one
 * upper, lower, digit and symbol, so it satisfies the register/change rule AND
 * the stricter administrator-create rule. Look-alike characters (0 O 1 l I) are
 * left out because an administrator reads this out or copies it by hand.
 * Never log or persist the result; only its argon2 hash is stored.
 */
export function generateStrongPassword(length: number = GENERATED_PASSWORD_LENGTH): string {
  const all = PASSWORD_UPPER + PASSWORD_LOWER + PASSWORD_DIGITS + PASSWORD_SYMBOLS;
  const chars = [
    pick(PASSWORD_UPPER),
    pick(PASSWORD_LOWER),
    pick(PASSWORD_DIGITS),
    pick(PASSWORD_SYMBOLS),
  ];
  while (chars.length < length) chars.push(pick(all));
  // Fisher-Yates over a draining pool: each step removes one random element with splice.
  const shuffled: string[] = [];
  while (chars.length > 0) {
    shuffled.push(...chars.splice(randomInt(chars.length), 1));
  }
  return shuffled.join('');
}
