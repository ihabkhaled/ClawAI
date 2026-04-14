import { generateCodeChallenge, generateCodeVerifier, generateOAuthState } from '../pkce.utility';
import { createHash } from 'node:crypto';

describe('pkce.utility', () => {
  describe('generateCodeVerifier', () => {
    it('should return a base64url string', () => {
      const verifier = generateCodeVerifier();
      expect(typeof verifier).toBe('string');
      expect(verifier.length).toBeGreaterThan(20);
    });

    it('should return a different value each call', () => {
      const v1 = generateCodeVerifier();
      const v2 = generateCodeVerifier();
      expect(v1).not.toBe(v2);
    });

    it('should not contain base64 padding or special chars (base64url)', () => {
      const verifier = generateCodeVerifier();
      expect(verifier).not.toMatch(/[+/=]/);
    });
  });

  describe('generateCodeChallenge', () => {
    it('should produce SHA-256 hash of verifier in base64url', () => {
      const verifier = 'test-verifier-abc123';
      const expected = createHash('sha256').update(verifier).digest('base64url');
      expect(generateCodeChallenge(verifier)).toBe(expected);
    });

    it('should be deterministic for the same input', () => {
      const verifier = 'deterministic-input';
      expect(generateCodeChallenge(verifier)).toBe(generateCodeChallenge(verifier));
    });
  });

  describe('generateOAuthState', () => {
    it('should return a hex string of 32 chars', () => {
      const state = generateOAuthState();
      expect(state).toMatch(/^[\da-f]{32}$/);
    });

    it('should return a different value each call', () => {
      expect(generateOAuthState()).not.toBe(generateOAuthState());
    });
  });
});
