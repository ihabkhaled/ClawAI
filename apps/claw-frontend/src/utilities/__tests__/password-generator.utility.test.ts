import { describe, expect, it } from 'vitest';

import { PASSWORD_GENERATOR_LENGTH } from '@/constants/password-generator.constants';
import { generatePassword } from '@/utilities/password-generator.utility';
import { evaluatePasswordStrength } from '@/utilities/password-strength.utility';

describe('generatePassword', () => {
  it('produces the requested length', () => {
    expect(generatePassword()).toHaveLength(PASSWORD_GENERATOR_LENGTH);
    expect(generatePassword(32)).toHaveLength(32);
  });

  it('satisfies the create-user policy on every draw, not most of them', () => {
    // The point of the guaranteed-class construction: a generated password that
    // fails validation reads as a bug in the product, so "usually passes" is not
    // good enough. 200 draws is enough to catch a uniform-fill regression.
    for (let attempt = 0; attempt < 200; attempt += 1) {
      expect(evaluatePasswordStrength(generatePassword()).meetsPolicy).toBe(true);
    }
  });

  it('excludes glyphs that are ambiguous when read off a screen', () => {
    const generated = Array.from({ length: 50 }, () => generatePassword()).join('');

    expect(generated).not.toMatch(/[lI1O0]/);
  });

  it('does not always place the guaranteed class picks in the same positions', () => {
    // Without the shuffle, index 0 is always uppercase and index 3 always a
    // symbol — a structural leak that shrinks the real search space.
    const firstCharacters = new Set(
      Array.from({ length: 60 }, () => generatePassword()[0] as string),
    );

    expect(firstCharacters.size).toBeGreaterThan(1);
  });

  it('produces a different password each time', () => {
    const draws = new Set(Array.from({ length: 50 }, () => generatePassword()));

    expect(draws.size).toBe(50);
  });

  it('still fills a length shorter than the number of required classes', () => {
    expect(generatePassword(2).length).toBeGreaterThanOrEqual(2);
  });
});
