import {
  assertSafeOutboundUrl,
  isHostExplicitlyAllowlisted,
  isPrivateOrLoopbackHost,
} from '../url-safety.utility';

/**
 * The SSRF boundary, at the depth it now has to hold.
 *
 * Until 2026-09-11 every URL the fetcher saw came from a search provider, so a
 * dotted-quad check was a defensible depth. Then the platform learned to open a
 * URL the USER typed, and every one of these spellings became something an
 * attacker could choose on purpose.
 */
describe('isPrivateOrLoopbackHost', () => {
  it('rejects the obvious loopback and private ranges', () => {
    for (const host of [
      'localhost',
      '127.0.0.1',
      '10.1.2.3',
      '172.16.0.1',
      '172.31.255.255',
      '192.168.1.1',
      '169.254.169.254',
      '0.0.0.0',
    ]) {
      expect(isPrivateOrLoopbackHost(host)).toBe(true);
    }
  });

  it('rejects IPv4 written in decimal, hex and octal', () => {
    // All four of these are 127.0.0.1. A dotted-quad regex sees only the first,
    // which is how a decimal-encoded loopback address walks past a check that
    // looks correct.
    expect(isPrivateOrLoopbackHost('2130706433')).toBe(true);
    expect(isPrivateOrLoopbackHost('0x7f.0.0.1')).toBe(true);
    expect(isPrivateOrLoopbackHost('0177.0.0.1')).toBe(true);
    expect(isPrivateOrLoopbackHost('127.1')).toBe(true);
  });

  it('rejects IPv6 loopback, unique-local and link-local', () => {
    expect(isPrivateOrLoopbackHost('::1')).toBe(true);
    expect(isPrivateOrLoopbackHost('[::1]')).toBe(true);
    expect(isPrivateOrLoopbackHost('fd00::1')).toBe(true);
    expect(isPrivateOrLoopbackHost('fe80::1')).toBe(true);
  });

  it('rejects loopback wearing an IPv4 costume', () => {
    // The host is not an IPv4 shape at all, so an IPv4-only check never fires.
    expect(isPrivateOrLoopbackHost('::ffff:127.0.0.1')).toBe(true);
    expect(isPrivateOrLoopbackHost('[::ffff:169.254.169.254]')).toBe(true);
  });

  it('rejects internal-only name suffixes and bare LAN labels', () => {
    // An attacker who controls a hostname does not need an IP literal.
    expect(isPrivateOrLoopbackHost('vault.internal')).toBe(true);
    expect(isPrivateOrLoopbackHost('printer.local')).toBe(true);
    expect(isPrivateOrLoopbackHost('claw-auth-service')).toBe(true);
    expect(isPrivateOrLoopbackHost('router')).toBe(true);
  });

  it('rejects carrier-grade NAT, which reaches other tenants on shared hosting', () => {
    expect(isPrivateOrLoopbackHost('100.64.0.1')).toBe(true);
    expect(isPrivateOrLoopbackHost('100.127.255.254')).toBe(true);
  });

  it('rejects multicast and the broadcast address', () => {
    expect(isPrivateOrLoopbackHost('224.0.0.1')).toBe(true);
    expect(isPrivateOrLoopbackHost('255.255.255.255')).toBe(true);
  });

  it('still allows ordinary public hosts', () => {
    for (const host of ['example.com', 'api.github.com', '8.8.8.8', '1.1.1.1', '100.63.1.1']) {
      expect(isPrivateOrLoopbackHost(host)).toBe(false);
    }
  });
});

describe('assertSafeOutboundUrl', () => {
  it('accepts a plain public https URL', () => {
    expect(assertSafeOutboundUrl('https://example.com/post').hostname).toBe('example.com');
  });

  it('refuses every protocol that is not http or https', () => {
    for (const url of ['file:///etc/passwd', 'gopher://example.com', 'ftp://example.com']) {
      expect(() => assertSafeOutboundUrl(url)).toThrow();
    }
  });

  it('refuses embedded credentials', () => {
    // As often a redirect-laundering trick as a real login, and nothing here
    // has any use for them.
    expect(() => assertSafeOutboundUrl('https://user:pass@example.com/')).toThrow(
      /embedded credentials/u,
    );
  });

  it('blocks cloud metadata EVEN when private hosts are permitted', () => {
    // The highest-value SSRF target there is: it hands out cloud credentials to
    // anything that can make a plain GET.
    for (const url of [
      'http://169.254.169.254/latest/meta-data/',
      'http://metadata.google.internal/computeMetadata/v1/',
      'http://100.100.100.200/',
      'http://192.0.0.192/',
    ]) {
      expect(() => assertSafeOutboundUrl(url, { allowPrivateHosts: true })).toThrow(
        /cloud-metadata/u,
      );
    }
  });

  it('blocks a private host by default', () => {
    expect(() => assertSafeOutboundUrl('http://127.0.0.1:4001/health')).toThrow(
      /private\/loopback/u,
    );
    expect(() => assertSafeOutboundUrl('http://claw-auth-service:4001/health')).toThrow(
      /private\/loopback/u,
    );
  });

  it('permits a private host only when explicitly opted into', () => {
    expect(() =>
      assertSafeOutboundUrl('http://wiki.internal/page', { allowPrivateHosts: true }),
    ).not.toThrow();
  });

  it('enforces an allowlist when one is given', () => {
    expect(() =>
      assertSafeOutboundUrl('https://evil.example.com/', { allowedHosts: ['good.example.com'] }),
    ).toThrow(/not on the allowlist/u);
    expect(() =>
      assertSafeOutboundUrl('https://good.example.com/', { allowedHosts: ['good.example.com'] }),
    ).not.toThrow();
  });

  it('does not let a wildcard allowlist entry match the bare suffix', () => {
    // `*.github.com` must not admit `github.com` itself, or a wildcard becomes
    // a broader grant than it reads as.
    expect(() =>
      assertSafeOutboundUrl('https://github.com/', { allowedHosts: ['*.github.com'] }),
    ).toThrow(/not on the allowlist/u);
    expect(() =>
      assertSafeOutboundUrl('https://api.github.com/', { allowedHosts: ['*.github.com'] }),
    ).not.toThrow();
  });
});

describe('isHostExplicitlyAllowlisted', () => {
  // Both HttpFetchAdapter and HeadlessFetchAdapter call this to decide
  // whether THIS request may reach a private address at all. One shared
  // implementation is the point — see the function's own doc comment.
  it('returns false for an empty allowlist regardless of host', () => {
    expect(isHostExplicitlyAllowlisted('http://127.0.0.1/', [])).toBe(false);
  });

  it('matches an exact host', () => {
    expect(
      isHostExplicitlyAllowlisted('http://internal.example.com/', ['internal.example.com']),
    ).toBe(true);
    expect(isHostExplicitlyAllowlisted('http://other.example.com/', ['internal.example.com'])).toBe(
      false,
    );
  });

  it('matches a wildcard suffix but not the bare suffix itself', () => {
    expect(isHostExplicitlyAllowlisted('http://api.internal.com/', ['*.internal.com'])).toBe(true);
    expect(isHostExplicitlyAllowlisted('http://internal.com/', ['*.internal.com'])).toBe(false);
  });

  it('returns false for an unparseable URL rather than throwing', () => {
    expect(isHostExplicitlyAllowlisted('not a url', ['internal.example.com'])).toBe(false);
  });
});
