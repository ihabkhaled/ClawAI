import { loginSchema } from '../login.dto';
import { refreshTokenSchema } from '../refresh-token.dto';

describe('loginSchema', () => {
  it('should validate a correct login payload', () => {
    const result = loginSchema.safeParse({
      email: 'user@example.com',
      password: 'MyPassword123',
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.email).toBe('user@example.com');
      expect(result.data.password).toBe('MyPassword123');
    }
  });

  it('should reject an invalid email', () => {
    const result = loginSchema.safeParse({
      email: 'not-an-email',
      password: 'MyPassword123',
    });

    expect(result.success).toBe(false);
  });

  it('should reject a missing email', () => {
    const result = loginSchema.safeParse({
      password: 'MyPassword123',
    });

    expect(result.success).toBe(false);
  });

  it('should reject an empty password', () => {
    const result = loginSchema.safeParse({
      email: 'user@example.com',
      password: '',
    });

    expect(result.success).toBe(false);
  });

  it('should reject a missing password', () => {
    const result = loginSchema.safeParse({
      email: 'user@example.com',
    });

    expect(result.success).toBe(false);
  });

  it('should reject an empty object', () => {
    const result = loginSchema.safeParse({});

    expect(result.success).toBe(false);
  });
});

describe('refreshTokenSchema', () => {
  it('should validate a correct refresh token payload', () => {
    const result = refreshTokenSchema.safeParse({
      refreshToken: 'a1b2c3d4e5f6',
    });

    expect(result.success).toBe(true);
  });

  it('should reject an empty refresh token', () => {
    const result = refreshTokenSchema.safeParse({
      refreshToken: '',
    });

    expect(result.success).toBe(false);
  });

  it('should reject a missing refresh token', () => {
    const result = refreshTokenSchema.safeParse({});

    expect(result.success).toBe(false);
  });

  it('should reject a refresh token exceeding max length', () => {
    const result = refreshTokenSchema.safeParse({
      refreshToken: 'a'.repeat(257),
    });

    expect(result.success).toBe(false);
  });
});
