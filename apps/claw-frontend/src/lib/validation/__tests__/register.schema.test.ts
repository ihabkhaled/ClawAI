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
});
