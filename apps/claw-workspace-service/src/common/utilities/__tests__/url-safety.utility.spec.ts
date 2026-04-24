import { assertSafeOutboundUrl, isPrivateOrLoopbackHost } from '../url-safety.utility';

describe('isPrivateOrLoopbackHost', () => {
  it.each([
    ['127.0.0.1', true],
    ['localhost', true],
    ['::1', true],
    ['10.1.2.3', true],
    ['172.16.0.1', true],
    ['172.31.255.254', true],
    ['192.168.1.1', true],
    ['169.254.169.254', true], // AWS metadata
    ['0.0.0.0', true],
  ])('classifies %s as private', (host, expected) => {
    expect(isPrivateOrLoopbackHost(host)).toBe(expected);
  });

  it.each([
    ['github.com', false],
    ['api.slack.com', false],
    ['example.com', false],
    ['8.8.8.8', false],
    ['172.32.0.1', false], // just outside 172.16/12
    ['11.0.0.1', false], // just outside 10/8
  ])('classifies %s as public', (host, expected) => {
    expect(isPrivateOrLoopbackHost(host)).toBe(expected);
  });
});

describe('assertSafeOutboundUrl', () => {
  it('accepts https://github.com', () => {
    expect(() => assertSafeOutboundUrl('https://github.com/api')).not.toThrow();
  });

  it('rejects private IP', () => {
    expect(() => assertSafeOutboundUrl('http://127.0.0.1:8080/path')).toThrow();
  });

  it('rejects AWS metadata endpoint', () => {
    expect(() => assertSafeOutboundUrl('http://169.254.169.254/latest/meta-data/')).toThrow();
  });

  it('rejects localhost', () => {
    expect(() => assertSafeOutboundUrl('http://localhost:3000/')).toThrow();
  });

  it('rejects non-http(s) protocol', () => {
    expect(() => assertSafeOutboundUrl('file:///etc/passwd')).toThrow();
    expect(() => assertSafeOutboundUrl('ftp://example.com/')).toThrow();
  });

  it('rejects malformed URL', () => {
    expect(() => assertSafeOutboundUrl('not a url')).toThrow();
  });

  it('enforces allowlist when provided', () => {
    expect(() =>
      assertSafeOutboundUrl('https://evil.com/', { allowedHosts: ['github.com', 'gitlab.com'] }),
    ).toThrow();
    expect(() =>
      assertSafeOutboundUrl('https://github.com/api', {
        allowedHosts: ['github.com', 'gitlab.com'],
      }),
    ).not.toThrow();
  });

  it('matches wildcard subdomain in allowlist', () => {
    expect(() =>
      assertSafeOutboundUrl('https://your-org.atlassian.net/', {
        allowedHosts: ['*.atlassian.net'],
      }),
    ).not.toThrow();
  });

  describe('allowPrivateHosts', () => {
    it('accepts localhost when allowPrivateHosts is true', () => {
      expect(() =>
        assertSafeOutboundUrl('http://localhost:3000/', { allowPrivateHosts: true }),
      ).not.toThrow();
    });

    it('accepts 127.0.0.1 when allowPrivateHosts is true', () => {
      expect(() =>
        assertSafeOutboundUrl('http://127.0.0.1:8080/api', { allowPrivateHosts: true }),
      ).not.toThrow();
    });

    it('accepts RFC1918 hosts when allowPrivateHosts is true', () => {
      expect(() =>
        assertSafeOutboundUrl('https://10.0.0.5/api', { allowPrivateHosts: true }),
      ).not.toThrow();
      expect(() =>
        assertSafeOutboundUrl('https://192.168.1.10/', { allowPrivateHosts: true }),
      ).not.toThrow();
      expect(() =>
        assertSafeOutboundUrl('https://172.20.0.1/', { allowPrivateHosts: true }),
      ).not.toThrow();
    });

    it('still blocks AWS metadata endpoint even when allowPrivateHosts is true', () => {
      expect(() =>
        assertSafeOutboundUrl('http://169.254.169.254/latest/meta-data/', {
          allowPrivateHosts: true,
        }),
      ).toThrow(/cloud-metadata/i);
    });

    it('still enforces allowedHosts when allowPrivateHosts is true', () => {
      expect(() =>
        assertSafeOutboundUrl('http://localhost:3000/', {
          allowPrivateHosts: true,
          allowedHosts: ['github.com'],
        }),
      ).toThrow(/allowlist/i);
    });

    it('still blocks non-http(s) protocols even when allowPrivateHosts is true', () => {
      expect(() =>
        assertSafeOutboundUrl('file:///etc/passwd', { allowPrivateHosts: true }),
      ).toThrow();
    });
  });
});
