import { describe, expect, it } from 'vitest';

import { buildContentSecurityPolicy } from '@/lib/security/content-security-policy';

const directive = (csp: string, name: string): string =>
  csp
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name} `)) ?? '';

describe('CSP script-src for AdSense', () => {
  it('allows the authorization page to notify the local VS Code callback without navigation', () => {
    const csp = buildContentSecurityPolicy({
      nonce: 'n',
      isDev: false,
      adsenseEnabled: false,
      upgradeInsecureRequests: true,
    });
    expect(directive(csp, 'connect-src')).toContain('http://127.0.0.1:*');
    expect(directive(csp, 'connect-src')).not.toContain('http://[::1]:*');
  });

  it('names the loader host in development, where strict-dynamic is absent', () => {
    // Without this the script tag renders and the browser blocks it, which
    // looks exactly like AdSense "not being implemented".
    const csp = buildContentSecurityPolicy({
      nonce: 'n',
      isDev: true,
      adsenseEnabled: true,
      upgradeInsecureRequests: false,
    });
    expect(directive(csp, 'script-src')).toContain('https://pagead2.googlesyndication.com');
  });

  it('omits the loader host in development when AdSense is off', () => {
    const csp = buildContentSecurityPolicy({
      nonce: 'n',
      isDev: true,
      adsenseEnabled: false,
      upgradeInsecureRequests: false,
    });
    expect(directive(csp, 'script-src')).not.toContain('googlesyndication');
  });

  it('uses Google supported strict CSP fallbacks in production', () => {
    const csp = buildContentSecurityPolicy({
      nonce: 'n1',
      isDev: false,
      adsenseEnabled: true,
      upgradeInsecureRequests: true,
    });
    const scriptSrc = directive(csp, 'script-src');
    expect(scriptSrc).toContain("'strict-dynamic'");
    expect(scriptSrc).toContain("'nonce-n1'");
    expect(scriptSrc).toContain("'unsafe-inline'");
    expect(scriptSrc).toContain("'unsafe-eval'");
    expect(scriptSrc).toContain('https:');
    expect(scriptSrc).toContain('http:');
  });

  it('keeps frame, img and connect hosts gated on AdSense being enabled', () => {
    const on = buildContentSecurityPolicy({
      nonce: 'n',
      isDev: false,
      adsenseEnabled: true,
      upgradeInsecureRequests: true,
    });
    const off = buildContentSecurityPolicy({
      nonce: 'n',
      isDev: false,
      adsenseEnabled: false,
      upgradeInsecureRequests: true,
    });
    // Asserted against the AdSense hosts specifically, not the substring
    // "google". Analytics later added googletagmanager.com to these same
    // directives unconditionally — correctly, since GTM is not gated on
    // AdSense — and the looser check would have failed on a change it was
    // never meant to police.
    for (const name of ['frame-src', 'img-src', 'connect-src']) {
      expect(directive(on, name)).toContain('doubleclick.net');
      expect(directive(off, name)).not.toContain('doubleclick.net');
      expect(directive(off, name)).not.toContain('googlesyndication.com');
    }
  });
});
