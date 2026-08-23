import { describe, expect, it } from 'vitest';
import type { z } from 'zod';

import { profileIdentitySchema } from '@/lib/validation/profile.schema';

type ProfileIdentityFormValues = z.infer<typeof profileIdentitySchema>;

const validPayload: ProfileIdentityFormValues = {
  firstName: 'Ada',
  lastName: 'Lovelace',
  phone: '+14155550100',
  username: 'ada_lovelace',
  currentPassword: 'correct-horse-battery-staple',
};

describe('profileIdentitySchema', () => {
  it('parses a valid payload', () => {
    const result = profileIdentitySchema.safeParse(validPayload);
    expect(result.success).toBe(true);
  });

  it('rejects a username shorter than 3 characters', () => {
    const result = profileIdentitySchema.safeParse({ ...validPayload, username: 'ab' });
    expect(result.success).toBe(false);
  });

  it('rejects a username longer than 32 characters', () => {
    const result = profileIdentitySchema.safeParse({
      ...validPayload,
      username: 'a'.repeat(33),
    });
    expect(result.success).toBe(false);
  });

  it('rejects a username containing a space', () => {
    const result = profileIdentitySchema.safeParse({ ...validPayload, username: 'ada love' });
    expect(result.success).toBe(false);
  });

  it('rejects a username containing an at sign', () => {
    const result = profileIdentitySchema.safeParse({ ...validPayload, username: 'ada@love' });
    expect(result.success).toBe(false);
  });

  it('rejects a firstName over 64 characters', () => {
    const result = profileIdentitySchema.safeParse({
      ...validPayload,
      firstName: 'a'.repeat(65),
    });
    expect(result.success).toBe(false);
  });

  it('accepts an empty phone string because it means clear it', () => {
    const result = profileIdentitySchema.safeParse({ ...validPayload, phone: '' });
    expect(result.success).toBe(true);
  });

  it('rejects a phone without a leading plus sign', () => {
    const result = profileIdentitySchema.safeParse({ ...validPayload, phone: '14155550100' });
    expect(result.success).toBe(false);
  });
});
