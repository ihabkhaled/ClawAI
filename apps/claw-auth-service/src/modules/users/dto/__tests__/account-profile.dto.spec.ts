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
});
