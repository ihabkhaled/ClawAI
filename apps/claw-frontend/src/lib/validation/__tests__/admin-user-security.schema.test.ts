import { describe, expect, it } from 'vitest';

import { BanDurationUnit } from '@/enums';
import { adminUserBanSchema } from '@/lib/validation/admin-user-ban.schema';
import { adminUserPasswordSchema } from '@/lib/validation/admin-user-password.schema';
import { adminUserEditSchema } from '@/lib/validation/admin-user.schema';

describe('adminUserEditSchema phone', () => {
  const base = { username: 'ada', firstName: '', lastName: '' };

  it.each(['', '+201001234567', '+14155550123'])('accepts %j', (phone) => {
    expect(adminUserEditSchema.safeParse({ ...base, phone }).success).toBe(true);
  });

  it.each(['01001234567', '+0123456789', '+12', 'abc', '+20 100 123'])('rejects %j', (phone) => {
    expect(adminUserEditSchema.safeParse({ ...base, phone }).success).toBe(false);
  });
});

describe('adminUserBanSchema', () => {
  it('accepts a timed ban and a lifetime ban with a reason', () => {
    expect(
      adminUserBanSchema.safeParse({ unit: BanDurationUnit.HOURS, amount: 6, reason: 'spam' })
        .success,
    ).toBe(true);
    expect(
      adminUserBanSchema.safeParse({ unit: BanDurationUnit.LIFETIME, amount: 1, reason: 'abuse' })
        .success,
    ).toBe(true);
  });

  it.each([
    [{ unit: BanDurationUnit.DAYS, amount: 0, reason: 'r' }],
    [{ unit: BanDurationUnit.DAYS, amount: 1.5, reason: 'r' }],
    [{ unit: BanDurationUnit.DAYS, amount: 1, reason: '   ' }],
    [{ unit: BanDurationUnit.DAYS, amount: 1, reason: 'x'.repeat(501) }],
    [{ unit: 'WEEKS', amount: 1, reason: 'r' }],
  ])('rejects %j', (value) => {
    expect(adminUserBanSchema.safeParse(value).success).toBe(false);
  });
});

describe('adminUserPasswordSchema', () => {
  it('accepts a password with upper, lower and a digit', () => {
    expect(adminUserPasswordSchema.safeParse({ password: 'New-Pass123' }).success).toBe(true);
  });

  it.each(['short1A', 'alllowercase1', 'ALLUPPERCASE1', 'NoDigitsHere', 'x'.repeat(129)])(
    'rejects %j',
    (password) => {
      expect(adminUserPasswordSchema.safeParse({ password }).success).toBe(false);
    },
  );
});
