import { hashPassword, verifyPassword } from '../hashing.utility';

describe('Hashing Utility', () => {
  describe('hashPassword', () => {
    it('should return a hash different from the input', async () => {
      const password = 'MySecurePassword123';
      const hash = await hashPassword(password);

      expect(hash).not.toBe(password);
      expect(typeof hash).toBe('string');
      expect(hash.length).toBeGreaterThan(0);
    });

    it('should produce different hashes for the same password (salted)', async () => {
      const password = 'MySecurePassword123';
      const hash1 = await hashPassword(password);
      const hash2 = await hashPassword(password);

      expect(hash1).not.toBe(hash2);
    });
  });

  describe('verifyPassword', () => {
    it('should return true for a correct password', async () => {
      const password = 'CorrectPassword456';
      const hash = await hashPassword(password);

      const result = await verifyPassword(hash, password);

      expect(result).toBe(true);
    });

    it('should return false for an incorrect password', async () => {
      const password = 'CorrectPassword456';
      const hash = await hashPassword(password);

      const result = await verifyPassword(hash, 'WrongPassword789');

      expect(result).toBe(false);
    });

    it('should return false for an empty password against a real hash', async () => {
      const hash = await hashPassword('SomePassword123');

      const result = await verifyPassword(hash, '');

      expect(result).toBe(false);
    });
  });
});
