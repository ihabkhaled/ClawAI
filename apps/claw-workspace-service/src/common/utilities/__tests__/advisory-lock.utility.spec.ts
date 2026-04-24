import { hashAdvisoryKey } from '../advisory-lock.utility';

describe('advisory-lock.utility', () => {
  describe('hashAdvisoryKey', () => {
    it('produces deterministic output for the same input', () => {
      expect(hashAdvisoryKey('workspace.sync.scheduler')).toBe(
        hashAdvisoryKey('workspace.sync.scheduler'),
      );
    });

    it('produces different output for different inputs', () => {
      const a = hashAdvisoryKey('a');
      const b = hashAdvisoryKey('b');
      expect(a).not.toBe(b);
    });

    it('returns a bigint within the signed 64-bit positive range', () => {
      const key = hashAdvisoryKey('some.namespace');
      const max = BigInt('0x7fffffffffffffff');
      expect(typeof key).toBe('bigint');
      expect(key >= 0n).toBe(true);
      expect(key <= max).toBe(true);
    });
  });
});
