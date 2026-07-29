import { describe, expect, it } from 'vitest';

import {
  buildContentSecurityPolicy,
  generateCspNonce,
} from '@/lib/security/content-security-policy';

describe('generateCspNonce', () => {
  it('returns a non-empty base64 string', () => {
    const nonce = generateCspNonce();
    expect(nonce).toMatch(/^[A-Za-z0-9+/]+={0,2}$/u);
    expect(nonce.length).toBeGreaterThanOrEqual(20);
  });

  it('returns a different value on each call', () => {
    const a = generateCspNonce();
    const b = generateCspNonce();
    expect(a).not.toBe(b);
  });
});

describe('buildContentSecurityPolicy', () => {
  const baseOptions = {
    nonce: 'abc123',
    isDev: false,
    adsenseEnabled: false,
    upgradeInsecureRequests: true,
  };

  it('embeds the nonce and strict-dynamic in script-src', () => {
    const csp = buildContentSecurityPolicy(baseOptions);
    expect(csp).toContain(`script-src 'self' 'nonce-abc123' 'strict-dynamic'`);
  });

  it('allows the pinned Paymob Pixel runtime to reach only Paymob checkout hosts', () => {
    const csp = buildContentSecurityPolicy({
      nonce: 'abc123',
      isDev: true,
      adsenseEnabled: false,
      upgradeInsecureRequests: false,
    });

    expect(csp).toContain('https://cdn.jsdelivr.net');
    expect(csp).toContain('https://accept.paymob.com');
    expect(csp).toContain('https://eg.checkout.paymob.com');
  });

  it('allows PayPal SDK scripts, checkout frames, images, and provider calls', () => {
    const csp = buildContentSecurityPolicy({
      nonce: 'abc123',
      isDev: true,
      adsenseEnabled: false,
      upgradeInsecureRequests: false,
    });

    expect(csp).toContain('https://www.paypal.com');
    expect(csp).toContain('https://www.paypalobjects.com');
    expect(csp).toContain('https://*.paypal.com');
  });

  it('never allows unsafe-inline for scripts', () => {
    const csp = buildContentSecurityPolicy(baseOptions);
    const scriptDirective = csp.split(';').find((d) => d.trim().startsWith('script-src'));
    expect(scriptDirective).not.toContain("'unsafe-inline'");
  });

  it('locks down object-src, base-uri, form-action and frame-ancestors', () => {
    const csp = buildContentSecurityPolicy(baseOptions);
    expect(csp).toContain(`object-src 'none'`);
    expect(csp).toContain(`base-uri 'self'`);
    expect(csp).toContain(`form-action 'self'`);
    expect(csp).toContain(`frame-ancestors 'none'`);
  });

  it('adds upgrade-insecure-requests only for production HTTPS requests', () => {
    expect(buildContentSecurityPolicy(baseOptions)).toContain('upgrade-insecure-requests');
    expect(buildContentSecurityPolicy({ ...baseOptions, isDev: true })).not.toContain(
      'upgrade-insecure-requests',
    );
    expect(
      buildContentSecurityPolicy({ ...baseOptions, upgradeInsecureRequests: false }),
    ).not.toContain('upgrade-insecure-requests');
  });

  it('does not emit a nonce or strict-dynamic in development (would break HMR)', () => {
    const dev = buildContentSecurityPolicy({ ...baseOptions, isDev: true });
    const scriptDirective = dev.split(';').find((d) => d.trim().startsWith('script-src'));
    expect(scriptDirective).not.toContain('nonce-');
    expect(scriptDirective).not.toContain('strict-dynamic');
    expect(scriptDirective).toContain("'unsafe-inline'");
  });

  it('adds unsafe-eval and websocket sources in development only', () => {
    const dev = buildContentSecurityPolicy({ ...baseOptions, isDev: true });
    expect(dev).toContain("'unsafe-eval'");
    expect(dev).toContain('wss:');
    const prod = buildContentSecurityPolicy(baseOptions);
    expect(prod).not.toContain("'unsafe-eval'");
    expect(prod).not.toContain('wss:');
  });

  it('omits Google ad hosts when adsense is disabled', () => {
    const csp = buildContentSecurityPolicy(baseOptions);
    expect(csp).not.toContain('googlesyndication.com');
    expect(csp).not.toContain('doubleclick.net');
  });

  it('widens frame/img/connect for Google ad hosts when adsense is enabled', () => {
    const csp = buildContentSecurityPolicy({ ...baseOptions, adsenseEnabled: true });
    expect(csp).toContain('https://googleads.g.doubleclick.net');
    expect(csp).toContain('https://pagead2.googlesyndication.com');
    expect(csp).toContain('https://tpc.googlesyndication.com');
    // strict-dynamic means script hosts are never enumerated
    const scriptDirective = csp.split(';').find((d) => d.trim().startsWith('script-src'));
    expect(scriptDirective).not.toContain('googlesyndication.com');
  });
});
