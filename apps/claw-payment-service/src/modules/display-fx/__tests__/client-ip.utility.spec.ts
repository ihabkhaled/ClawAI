import {
  hashClientIp,
  isPublicRoutableIp,
  resolveTrustedClientIp,
} from '../service.utilities/client-ip.utility';

describe('client-ip.utility', () => {
  describe('resolveTrustedClientIp', () => {
    it('reads the header nginx overwrites', () => {
      expect(resolveTrustedClientIp({ 'x-real-ip': '41.33.10.5' })).toBe('41.33.10.5');
    });

    it('ignores X-Forwarded-For entirely', () => {
      // nginx APPENDS to whatever the client sent, so its left-most entry is
      // attacker-controlled by design. Reading it would make a spoofed country
      // indistinguishable from a real one.
      expect(resolveTrustedClientIp({ 'x-forwarded-for': '41.33.10.5, 10.0.0.1' })).toBeNull();
    });

    it('ignores a client-supplied country or client-ip header', () => {
      expect(
        resolveTrustedClientIp({
          'cf-connecting-ip': '41.33.10.5',
          'true-client-ip': '41.33.10.5',
        }),
      ).toBeNull();
    });

    it('takes the first value when a header arrives more than once', () => {
      expect(resolveTrustedClientIp({ 'x-real-ip': ['41.33.10.5', '1.1.1.1'] })).toBe('41.33.10.5');
    });

    it('returns null when the header is absent or junk', () => {
      expect(resolveTrustedClientIp({})).toBeNull();
      expect(resolveTrustedClientIp({ 'x-real-ip': 'not-an-ip' })).toBeNull();
      expect(resolveTrustedClientIp({ 'x-real-ip': '' })).toBeNull();
      expect(resolveTrustedClientIp({ 'x-real-ip': '999.999.999.999' })).toBeNull();
    });
  });

  describe('isPublicRoutableIp', () => {
    it('accepts a real public address', () => {
      expect(isPublicRoutableIp('41.33.10.5')).toBe(true);
      expect(isPublicRoutableIp('8.8.8.8')).toBe(true);
      expect(isPublicRoutableIp('2a03:2880:f12f::face')).toBe(true);
    });

    it('rejects addresses that never crossed the internet', () => {
      // Local development and container traffic. Asking a geo API where
      // 172.18.0.4 is spends a request to be told nothing.
      for (const ip of [
        '127.0.0.1',
        '10.0.0.4',
        '172.18.0.4',
        '192.168.1.10',
        '100.64.0.1',
        '169.254.1.1',
        '0.0.0.0',
        '::1',
        'fd00::1',
        'fe80::1',
      ]) {
        expect(isPublicRoutableIp(ip)).toBe(false);
      }
    });

    it('rejects anything that is not an address', () => {
      for (const value of ['', 'localhost', 'DROP TABLE', '1.2.3', '1.2.3.4.5']) {
        expect(isPublicRoutableIp(value)).toBe(false);
      }
    });
  });

  describe('hashClientIp', () => {
    it('is stable and does not contain the address', () => {
      // The cache key must be derivable twice and reversible never: a durable
      // record of who visited from where is a privacy cost paid for a currency
      // symbol.
      const hashed = hashClientIp('41.33.10.5');
      expect(hashed).toBe(hashClientIp('41.33.10.5'));
      expect(hashed).not.toContain('41.33');
      expect(hashed).toHaveLength(32);
    });

    it('separates different addresses', () => {
      expect(hashClientIp('41.33.10.5')).not.toBe(hashClientIp('41.33.10.6'));
    });
  });
});
