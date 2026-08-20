import { generateNumericOtp, normalizeEmail } from '../email-change-otp.utility';

describe('generateNumericOtp', () => {
  it('should return a 6-digit string every time', () => {
    for (let i = 0; i < 100; i++) {
      const otp = generateNumericOtp();
      expect(otp).toHaveLength(6);
      expect(otp).toMatch(/^\d{6}$/);
    }
  });
});

describe('normalizeEmail', () => {
  it('should trim and lowercase the email', () => {
    expect(normalizeEmail('  User.Name@Example.COM  ')).toBe('user.name@example.com');
  });
});
