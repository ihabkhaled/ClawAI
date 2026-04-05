import { describe, expect, it } from 'vitest';

import { loginSchema } from '@/lib/validation/login.schema';

describe('loginSchema', () => {
  it('accepts valid email and password', () => {
    const result = loginSchema.safeParse({
      email: 'user@example.com',
      password: 'securePass123',
    });
    expect(result.success).toBe(true);
  });

  it('rejects empty email', () => {
    const result = loginSchema.safeParse({ email: '', password: 'pass' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe('Please enter a valid email address');
    }
  });

  it('rejects invalid email format', () => {
    const result = loginSchema.safeParse({
      email: 'not-an-email',
      password: 'pass',
    });
    expect(result.success).toBe(false);
  });

  it('rejects empty password', () => {
    const result = loginSchema.safeParse({
      email: 'user@test.com',
      password: '',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe('Password is required');
    }
  });

  it('rejects missing email field', () => {
    const result = loginSchema.safeParse({ password: 'pass' });
    expect(result.success).toBe(false);
  });

  it('rejects missing password field', () => {
    const result = loginSchema.safeParse({ email: 'user@test.com' });
    expect(result.success).toBe(false);
  });

  it('rejects both fields missing', () => {
    const result = loginSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it('strips unknown fields', () => {
    const result = loginSchema.safeParse({
      email: 'user@test.com',
      password: 'pass',
      extra: 'field',
    });
    expect(result.success).toBe(true);
  });
});
