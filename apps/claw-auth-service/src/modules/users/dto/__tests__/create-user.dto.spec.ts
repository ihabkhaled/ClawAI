import { createUserSchema } from '../create-user.dto';

const base = { email: 'admin@example.com', username: 'admin-user', password: 'Password1!' };

describe('createUserSchema', () => {
  it('accepts and trims optional profile fields', () => {
    const result = createUserSchema.parse({
      ...base,
      firstName: '  Ada  ',
      lastName: '  Lovelace  ',
      phone: '  +441234567890  ',
    });
    expect(result).toMatchObject({
      firstName: 'Ada',
      lastName: 'Lovelace',
      phone: '+441234567890',
    });
  });

  it('accepts omitted profile fields', () => {
    expect(createUserSchema.safeParse(base).success).toBe(true);
  });

  it.each([
    { firstName: ' ' },
    { lastName: ' ' },
    { firstName: 'a'.repeat(65) },
    { lastName: 'a'.repeat(65) },
    { phone: '12345' },
  ])('rejects invalid profile fields', (profile) => {
    expect(createUserSchema.safeParse({ ...base, ...profile }).success).toBe(false);
  });
});
