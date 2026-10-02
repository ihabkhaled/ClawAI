import { describe, expect, it } from 'vitest';

import { registerSchema } from '@/lib/validation/register.schema';

const base = {
  firstName: 'Jane',
  lastName: 'Doe',
  email: 'jane@example.com',
  password: 'Password1!',
  confirmPassword: 'Password1!',
};

describe('registerSchema', () => {
  it('requires first and last name', () => {
    expect(registerSchema.safeParse({ ...base, firstName: '' }).success).toBe(false);
    expect(registerSchema.safeParse({ ...base, lastName: '' }).success).toBe(false);
  });

  it('trims names and rejects names longer than 64 characters', () => {
    const valid = registerSchema.parse({ ...base, firstName: ' Jane ', lastName: ' Doe ' });
    expect(valid).toMatchObject({ firstName: 'Jane', lastName: 'Doe' });
    expect(registerSchema.safeParse({ ...base, firstName: 'x'.repeat(65) }).success).toBe(false);
    expect(registerSchema.safeParse({ ...base, lastName: 'x'.repeat(65) }).success).toBe(false);
  });

  it('accepts omitted, blank, or valid E.164 phone values', () => {
    expect(registerSchema.parse(base).phone).toBeUndefined();
    expect(registerSchema.parse({ ...base, phone: '' }).phone).toBeUndefined();
    expect(registerSchema.parse({ ...base, phone: '+15551234567' }).phone).toBe('+15551234567');
  });

  it('rejects invalid phone numbers', () => {
    expect(registerSchema.safeParse({ ...base, phone: '123-abc' }).success).toBe(false);
  });

  it('keeps the password-match refinement', () => {
    expect(registerSchema.safeParse({ ...base, confirmPassword: 'Different1!' }).success).toBe(
      false,
    );
  });

  // Messages are i18n keys the form renders through t(); an English sentence
  // here was shown untranslated to every non-English reader.
  it.each([
    ['email', 'nope', 'auth.signup.emailInvalid'],
    ['email', '', 'auth.signup.emailRequired'],
    ['password', 'Ab1', 'auth.signup.passwordTooShort'],
    ['password', 'lowercase1', 'auth.signup.passwordNeedsUppercase'],
    ['password', 'UPPERCASE1', 'auth.signup.passwordNeedsLowercase'],
    ['password', 'NoDigitsHere', 'auth.signup.passwordNeedsNumber'],
    ['phone', '+20', 'auth.signup.phoneInvalid'],
    ['firstName', ' ', 'auth.signup.firstNameRequired'],
  ])('reports %s=%j with the key %s', (field, value, key) => {
    const extra = field === 'password' ? { confirmPassword: value } : {};
    const result = registerSchema.safeParse({ ...base, ...extra, [field]: value });
    expect(result.success).toBe(false);
    expect(result.error?.issues.map((issue) => issue.message)).toContain(key);
  });

  it('reports a mismatched confirmation on confirmPassword with a translated key', () => {
    const result = registerSchema.safeParse({ ...base, confirmPassword: 'Password2!' });
    const issue = result.error?.issues.find((entry) => entry.path[0] === 'confirmPassword');
    expect(issue?.message).toBe('auth.signup.passwordsDoNotMatch');
  });

  it('asks for the confirmation when it is left empty', () => {
    const result = registerSchema.safeParse({ ...base, confirmPassword: '' });
    expect(result.error?.issues.map((issue) => issue.message)).toContain(
      'auth.signup.confirmPasswordRequired',
    );
  });
});
