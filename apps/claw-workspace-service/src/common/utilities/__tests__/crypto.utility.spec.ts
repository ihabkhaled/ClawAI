import { decryptString, encryptString, generateSecureToken, sha256Hex } from '../crypto.utility';

const TEST_KEY = 'a'.repeat(64); // 64 hex chars = 32 bytes

describe('crypto.utility', () => {
  describe('encryptString / decryptString', () => {
    it('should encrypt and decrypt successfully', () => {
      const plaintext = 'my-secret-token';
      const encrypted = encryptString(plaintext, TEST_KEY);
      expect(encrypted).not.toBe(plaintext);
      expect(decryptString(encrypted, TEST_KEY)).toBe(plaintext);
    });

    it('should produce different ciphertext each time (random IV)', () => {
      const plaintext = 'same-text';
      const c1 = encryptString(plaintext, TEST_KEY);
      const c2 = encryptString(plaintext, TEST_KEY);
      expect(c1).not.toBe(c2);
    });

    it('should decrypt to the original value for JSON strings', () => {
      const json = JSON.stringify({ accessToken: 'tok', scopes: ['read'] });
      expect(decryptString(encryptString(json, TEST_KEY), TEST_KEY)).toBe(json);
    });
  });

  describe('generateSecureToken', () => {
    it('should return a hex string of correct length', () => {
      const token = generateSecureToken(16);
      expect(token).toMatch(/^[\da-f]+$/);
      expect(token).toHaveLength(32); // 16 bytes = 32 hex chars
    });

    it('should return different tokens each time', () => {
      expect(generateSecureToken()).not.toBe(generateSecureToken());
    });
  });

  describe('sha256Hex', () => {
    it('should return a 64-char hex string', () => {
      const hash = sha256Hex('hello');
      expect(hash).toMatch(/^[\da-f]{64}$/);
    });

    it('should be deterministic', () => {
      expect(sha256Hex('test')).toBe(sha256Hex('test'));
    });
  });
});
