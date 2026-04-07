import { signAccessToken, signRefreshToken, verifyAccessToken } from '../jwt.utility';
import { UserRole } from '../../enums';

const TEST_SECRET = 'test-secret-key-that-is-long-enough-for-hs256';

describe('JWT Utility', () => {
  describe('signAccessToken', () => {
    it('should create a valid JWT string', () => {
      const payload = { sub: 'user-1', email: 'test@example.com', role: UserRole.VIEWER };
      const token = signAccessToken(payload, TEST_SECRET, '15m');

      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3);
    });
  });

  describe('verifyAccessToken', () => {
    it('should return the payload for a valid token', () => {
      const payload = { sub: 'user-1', email: 'test@example.com', role: UserRole.ADMIN };
      const token = signAccessToken(payload, TEST_SECRET, '15m');

      const decoded = verifyAccessToken(token, TEST_SECRET);

      expect(decoded.sub).toBe('user-1');
      expect(decoded.email).toBe('test@example.com');
      expect(decoded.role).toBe(UserRole.ADMIN);
      expect(decoded.iat).toBeDefined();
      expect(decoded.exp).toBeDefined();
    });

    it('should throw for an expired token', () => {
      const payload = { sub: 'user-1', email: 'test@example.com', role: UserRole.VIEWER };
      // Sign with 0 seconds expiry — token is immediately expired
      const token = signAccessToken(payload, TEST_SECRET, '0s');

      expect(() => verifyAccessToken(token, TEST_SECRET)).toThrow();
    });

    it('should throw for a token signed with a different secret', () => {
      const payload = { sub: 'user-1', email: 'test@example.com', role: UserRole.VIEWER };
      const token = signAccessToken(payload, 'different-secret-key-long-enough', '15m');

      expect(() => verifyAccessToken(token, TEST_SECRET)).toThrow();
    });

    it('should throw for a malformed token', () => {
      expect(() => verifyAccessToken('not.a.valid-token', TEST_SECRET)).toThrow();
    });

    it('should throw for an empty string token', () => {
      expect(() => verifyAccessToken('', TEST_SECRET)).toThrow();
    });
  });

  describe('signRefreshToken', () => {
    it('should return a hex string', () => {
      const token = signRefreshToken();

      expect(typeof token).toBe('string');
      expect(token).toMatch(/^[0-9a-f]+$/);
    });

    it('should return a 96-character hex string (48 bytes)', () => {
      const token = signRefreshToken();

      expect(token).toHaveLength(96);
    });

    it('should return unique tokens on consecutive calls', () => {
      const token1 = signRefreshToken();
      const token2 = signRefreshToken();

      expect(token1).not.toBe(token2);
    });
  });
});
