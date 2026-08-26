import { deleteOwnAccountSchema, updateOwnProfileSchema } from '../account-profile.dto';

describe('account profile DTOs', () => {
  it('accepts a password-protected profile update', () => {
    expect(
      updateOwnProfileSchema.safeParse({ currentPassword: 'CurrentPass1!', username: 'renamed' })
        .success,
    ).toBe(true);
  });

  it('strips email from a password-protected profile update', () => {
    const result = updateOwnProfileSchema.parse({
      currentPassword: 'CurrentPass1!',
      email: 'new@example.com',
      username: 'renamed',
    });

    expect(result).toEqual({ currentPassword: 'CurrentPass1!', username: 'renamed' });
    expect(result).not.toHaveProperty('email');
  });

  it.each([
    {},
    { currentPassword: '' },
    { currentPassword: 'x'.repeat(257) },
    { currentPassword: 'CurrentPass1!', email: 'invalid' },
    { currentPassword: 'CurrentPass1!' },
  ])('rejects an invalid profile update %#', (input) => {
    expect(updateOwnProfileSchema.safeParse(input).success).toBe(false);
  });

  it('accepts a password-protected account deletion', () => {
    expect(deleteOwnAccountSchema.safeParse({ currentPassword: 'CurrentPass1!' }).success).toBe(
      true,
    );
  });

  it.each([{}, { currentPassword: '' }, { currentPassword: 'x'.repeat(257) }])(
    'rejects an invalid account deletion %#',
    (input) => {
      expect(deleteOwnAccountSchema.safeParse(input).success).toBe(false);
    },
  );

  describe('personal details', () => {
    const base = { currentPassword: 'CurrentPass1!' };

    it('accepts a first name, last name and phone on their own', () => {
      const result = updateOwnProfileSchema.safeParse({
        ...base,
        firstName: 'Ada',
        lastName: 'Lovelace',
        phone: '+14155550123',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.firstName).toBe('Ada');
        expect(result.data.lastName).toBe('Lovelace');
        expect(result.data.phone).toBe('+14155550123');
      }
    });

    it('treats a blank personal field as a request to clear it', () => {
      const result = updateOwnProfileSchema.safeParse({
        ...base,
        firstName: '',
        lastName: '   ',
        phone: '',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.firstName).toBeNull();
        expect(result.data.lastName).toBeNull();
        expect(result.data.phone).toBeNull();
      }
    });

    it('trims a personal field before storing it', () => {
      const result = updateOwnProfileSchema.safeParse({ ...base, firstName: '  Ada  ' });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.firstName).toBe('Ada');
      }
    });

    it('rejects a name longer than 64 characters', () => {
      expect(updateOwnProfileSchema.safeParse({ ...base, firstName: 'a'.repeat(65) }).success).toBe(
        false,
      );
    });

    it('rejects a phone that is not in international format', () => {
      for (const phone of ['5550123', '+0155501234', 'not-a-phone']) {
        expect(updateOwnProfileSchema.safeParse({ ...base, phone }).success).toBe(false);
      }
    });

    it('still requires at least one field beyond the password', () => {
      expect(updateOwnProfileSchema.safeParse(base).success).toBe(false);
    });
  });
});
