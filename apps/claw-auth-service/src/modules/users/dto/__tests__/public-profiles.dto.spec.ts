import {
  PUBLIC_PROFILES_MAX_IDS,
  publicProfilesBodySchema,
  publicProfileUsernameSchema,
} from '../public-profiles.dto';

describe('public profiles DTO', () => {
  it('accepts up to the id cap', () => {
    const ids = Array.from({ length: PUBLIC_PROFILES_MAX_IDS }, (_, index) => `u${String(index)}`);
    expect(publicProfilesBodySchema.safeParse({ ids }).success).toBe(true);
  });

  it('refuses more than the cap, empty ids, long ids and extra keys', () => {
    const tooMany = Array.from(
      { length: PUBLIC_PROFILES_MAX_IDS + 1 },
      (_, index) => `u${String(index)}`,
    );
    expect(publicProfilesBodySchema.safeParse({ ids: tooMany }).success).toBe(false);
    expect(publicProfilesBodySchema.safeParse({ ids: [''] }).success).toBe(false);
    expect(publicProfilesBodySchema.safeParse({ ids: ['x'.repeat(65)] }).success).toBe(false);
    expect(publicProfilesBodySchema.safeParse({ ids: ['a'], email: 'x' }).success).toBe(false);
    expect(publicProfilesBodySchema.safeParse({}).success).toBe(false);
  });

  it('accepts only register-form usernames', () => {
    expect(publicProfileUsernameSchema.safeParse('Ada_l-1').success).toBe(true);
    expect(publicProfileUsernameSchema.safeParse('a b').success).toBe(false);
    expect(publicProfileUsernameSchema.safeParse('x'.repeat(33)).success).toBe(false);
    expect(publicProfileUsernameSchema.safeParse('مرحبا').success).toBe(false);
  });
});
