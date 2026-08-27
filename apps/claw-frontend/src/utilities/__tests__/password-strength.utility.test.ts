import { describe, expect, it } from 'vitest';

import { PasswordStrengthLevel } from '@/enums/password-strength-level.enum';
import { evaluatePasswordStrength } from '@/utilities/password-strength.utility';

describe('evaluatePasswordStrength', () => {
  it('treats an empty password as weak with an empty bar', () => {
    const result = evaluatePasswordStrength('');

    expect(result.level).toBe(PasswordStrengthLevel.Weak);
    expect(result.score).toBe(0);
    expect(result.meetsPolicy).toBe(false);
  });

  it('requires a symbol, matching the backend create-user schema', () => {
    // The form used to accept this and the API refused it — the two layers
    // disagreed about whether a symbol was required.
    const result = evaluatePasswordStrength('StrongPass1');

    expect(result.requirements.hasSymbol).toBe(false);
    expect(result.meetsPolicy).toBe(false);
  });

  it('names each unmet requirement individually', () => {
    const result = evaluatePasswordStrength('abc');

    expect(result.requirements).toEqual({
      hasMinLength: false,
      withinMaxLength: true,
      hasUppercase: false,
      hasLowercase: true,
      hasDigit: false,
      hasSymbol: false,
    });
  });

  it('scores a just-passing password as fair', () => {
    const result = evaluatePasswordStrength('Aa1!aaaa');

    expect(result.meetsPolicy).toBe(true);
    expect(result.level).toBe(PasswordStrengthLevel.Fair);
  });

  it('scores a longer compliant password as good', () => {
    expect(evaluatePasswordStrength('Aa1!aaaaaaaa').level).toBe(PasswordStrengthLevel.Good);
  });

  it('scores a long compliant password as strong', () => {
    expect(evaluatePasswordStrength('Aa1!aaaaaaaaaaaa').level).toBe(PasswordStrengthLevel.Strong);
  });

  it('fails a password past the maximum length however strong it looks', () => {
    const result = evaluatePasswordStrength(`Aa1!${'a'.repeat(200)}`);

    expect(result.requirements.withinMaxLength).toBe(false);
    expect(result.meetsPolicy).toBe(false);
    expect(result.level).toBe(PasswordStrengthLevel.Weak);
  });
});
