import { computeBackoffMs, shouldRetry } from '../retry-policy.utility';

describe('retry-policy.utility', () => {
  describe('computeBackoffMs', () => {
    const config = { baseMs: 1000, jitterMs: 500, maxAttempts: 3 };

    it('returns base on attempt 0', () => {
      const result = computeBackoffMs(0, config, () => 0);
      expect(result).toBe(1000);
    });

    it('doubles on attempt 1', () => {
      const result = computeBackoffMs(1, config, () => 0);
      expect(result).toBe(2000);
    });

    it('quadruples on attempt 2', () => {
      const result = computeBackoffMs(2, config, () => 0);
      expect(result).toBe(4000);
    });

    it('adds jitter capped by jitterMs', () => {
      const result = computeBackoffMs(0, config, () => 0.999);
      expect(result).toBeGreaterThanOrEqual(1000);
      expect(result).toBeLessThanOrEqual(1000 + config.jitterMs);
    });

    it('handles negative attempt by clamping to 0', () => {
      const result = computeBackoffMs(-5, config, () => 0);
      expect(result).toBe(1000);
    });

    it('handles zero jitter', () => {
      const result = computeBackoffMs(1, { ...config, jitterMs: 0 }, () => 0.9);
      expect(result).toBe(2000);
    });

    it('handles negative jitterMs by treating as zero', () => {
      const result = computeBackoffMs(0, { ...config, jitterMs: -1 }, () => 0.9);
      expect(result).toBe(1000);
    });

    it('growth is exponential in 2**n', () => {
      const results = [0, 1, 2, 3, 4].map((attempt) => computeBackoffMs(attempt, config, () => 0));
      expect(results).toEqual([1000, 2000, 4000, 8000, 16000]);
    });
  });

  describe('shouldRetry', () => {
    const config = { baseMs: 1, jitterMs: 0, maxAttempts: 3 };

    it('returns true when attempts consumed < max', () => {
      expect(shouldRetry(0, config)).toBe(true);
      expect(shouldRetry(1, config)).toBe(true);
      expect(shouldRetry(2, config)).toBe(true);
    });

    it('returns false when attempts consumed equals max', () => {
      expect(shouldRetry(3, config)).toBe(false);
    });

    it('returns false when attempts consumed exceeds max', () => {
      expect(shouldRetry(5, config)).toBe(false);
    });
  });
});
