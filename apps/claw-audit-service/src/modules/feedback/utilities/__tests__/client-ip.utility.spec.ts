import { hashRateKeyPart, resolveClientIp } from '../client-ip.utility';

describe('resolveClientIp', () => {
  it('reads the address nginx set', () => {
    expect(resolveClientIp({ 'x-real-ip': '203.0.113.7' })).toBe('203.0.113.7');
  });

  it('reads the first value of a repeated header', () => {
    expect(resolveClientIp({ 'x-real-ip': ['203.0.113.7', '10.0.0.1'] })).toBe('203.0.113.7');
  });

  it('accepts IPv6', () => {
    expect(resolveClientIp({ 'x-real-ip': '2001:db8::1' })).toBe('2001:db8::1');
  });

  it('never trusts X-Forwarded-For', () => {
    expect(resolveClientIp({ 'x-forwarded-for': '198.51.100.9' })).toBe('unknown');
  });

  it('falls back when the header is missing or not an address', () => {
    expect(resolveClientIp({})).toBe('unknown');
    expect(resolveClientIp({ 'x-real-ip': 'not-an-ip' })).toBe('unknown');
  });
});

describe('hashRateKeyPart', () => {
  it('is stable and case-insensitive', () => {
    expect(hashRateKeyPart('Ada@Example.com ')).toBe(hashRateKeyPart('ada@example.com'));
  });

  it('does not contain the input', () => {
    expect(hashRateKeyPart('ada@example.com')).not.toContain('ada');
    expect(hashRateKeyPart('ada@example.com')).toHaveLength(32);
  });
});
