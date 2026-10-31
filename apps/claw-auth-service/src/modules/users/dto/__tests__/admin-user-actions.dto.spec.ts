import { BanDurationUnit, PresenceFilter } from '../../../../common/enums';
import { banUserSchema } from '../ban-user.dto';
import { listUsersQuerySchema } from '../list-users-query.dto';
import { setUserPasswordSchema } from '../set-user-password.dto';
import { updateUserSchema } from '../update-user.dto';

describe('banUserSchema', () => {
  it('accepts a timed ban with a reason', () => {
    expect(
      banUserSchema.safeParse({ unit: BanDurationUnit.HOURS, amount: 6, reason: ' spam ' }),
    ).toMatchObject({ success: true, data: { reason: 'spam' } });
  });

  it('accepts a lifetime ban without an amount', () => {
    expect(
      banUserSchema.safeParse({ unit: BanDurationUnit.LIFETIME, reason: 'abuse' }).success,
    ).toBe(true);
  });

  it.each([
    ['no reason', { unit: BanDurationUnit.LIFETIME }],
    ['a blank reason', { unit: BanDurationUnit.LIFETIME, reason: '   ' }],
    ['a reason over 500 characters', { unit: BanDurationUnit.LIFETIME, reason: 'x'.repeat(501) }],
    ['a timed ban without an amount', { unit: BanDurationUnit.DAYS, reason: 'r' }],
    ['a zero amount', { unit: BanDurationUnit.DAYS, amount: 0, reason: 'r' }],
    ['a fractional amount', { unit: BanDurationUnit.DAYS, amount: 1.5, reason: 'r' }],
    ['over ten years', { unit: BanDurationUnit.DAYS, amount: 4000, reason: 'r' }],
    ['an unknown unit', { unit: 'WEEKS', amount: 1, reason: 'r' }],
  ])('rejects %s', (_label, body) => {
    expect(banUserSchema.safeParse(body).success).toBe(false);
  });
});

describe('setUserPasswordSchema', () => {
  it('accepts MANUAL with a password and GENERATE with none', () => {
    expect(setUserPasswordSchema.safeParse({ mode: 'MANUAL', password: 'Abcdef12' }).success).toBe(
      true,
    );
    expect(setUserPasswordSchema.safeParse({ mode: 'GENERATE' }).success).toBe(true);
  });

  it('rejects MANUAL without a password, an empty one, or an unknown mode', () => {
    expect(setUserPasswordSchema.safeParse({ mode: 'MANUAL' }).success).toBe(false);
    expect(setUserPasswordSchema.safeParse({ mode: 'MANUAL', password: '' }).success).toBe(false);
    expect(setUserPasswordSchema.safeParse({ mode: 'RESET' }).success).toBe(false);
  });
});

describe('updateUserSchema phone', () => {
  it.each(['+201001234567', '+14155550123', '+4915112345678'])('accepts %s', (phone) => {
    expect(updateUserSchema.safeParse({ phone }).data?.phone).toBe(phone);
  });

  it('clears the phone with an empty string or null', () => {
    expect(updateUserSchema.safeParse({ phone: '' }).data?.phone).toBeNull();
    expect(updateUserSchema.safeParse({ phone: '   ' }).data?.phone).toBeNull();
    expect(updateUserSchema.safeParse({ phone: null }).data?.phone).toBeNull();
  });

  it('leaves it untouched when absent', () => {
    expect(updateUserSchema.safeParse({}).data).not.toHaveProperty('phone');
  });

  it.each(['01001234567', '+0123456789', '+12', '+1234567890123456', 'abc', '+20 100 123 4567'])(
    'rejects %s',
    (phone) => {
      expect(updateUserSchema.safeParse({ phone }).success).toBe(false);
    },
  );
});

describe('listUsersQuerySchema presence and ban filters', () => {
  it('parses presence, banned and the lastSeenAt sort', () => {
    const parsed = listUsersQuerySchema.parse({
      presence: 'ONLINE',
      banned: 'true',
      sortBy: 'lastSeenAt',
    });
    expect(parsed).toMatchObject({ presence: PresenceFilter.ONLINE, banned: true });
    expect(listUsersQuerySchema.parse({ banned: 'false' }).banned).toBe(false);
  });

  it('rejects an unknown presence value', () => {
    expect(listUsersQuerySchema.safeParse({ presence: 'ALWAYS' }).success).toBe(false);
  });
});
