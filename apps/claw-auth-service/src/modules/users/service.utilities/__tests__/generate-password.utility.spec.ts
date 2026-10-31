import { GENERATED_PASSWORD_LENGTH } from '../../constants/user-admin.constants';
import { createUserSchema } from '../../dto/create-user.dto';
import { generateStrongPassword } from '../generate-password.utility';
import { validatePasswordStrength } from '../password-policy.utility';

describe('generateStrongPassword', () => {
  it('always satisfies the platform policy and the stricter admin-create rule', () => {
    for (let run = 0; run < 300; run += 1) {
      const password = generateStrongPassword();
      expect(password).toHaveLength(GENERATED_PASSWORD_LENGTH);
      expect(validatePasswordStrength(password)).toEqual({ valid: true, errors: [] });
      expect(/[^A-Za-z0-9]/.test(password)).toBe(true);
      const accepted = createUserSchema.safeParse({
        email: 'a@b.co',
        username: 'someone',
        password,
        role: 'VIEWER',
      });
      expect(accepted.success).toBe(true);
    }
  });

  it('never repeats (CSPRNG, not a seeded sequence)', () => {
    const seen = new Set(Array.from({ length: 500 }, () => generateStrongPassword()));
    expect(seen.size).toBe(500);
  });

  it('leaves out look-alike characters an admin could misread', () => {
    for (let run = 0; run < 200; run += 1) {
      expect(generateStrongPassword()).not.toMatch(/[0O1lI]/);
    }
  });
});
