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

  it('lets the AdSense invalid-traffic beacon through, in both directives it uses', () => {
    // Caught in the browser console on the live site: the beacon was blocked
    // while ads rendered normally. A blocked connect-src is invisible from the
    // page — nothing looks broken — but the signal Google uses to separate real
    // traffic from fraudulent traffic never arrives, and that signal protects
    // the ad account. It is reached by fetch AND from an invisible iframe, so
    // naming it in only one directive leaves it blocked half the time.
    const csp = buildContentSecurityPolicy({
      nonce: 'n',
      isDev: false,
      adsenseEnabled: true,
      upgradeInsecureRequests: true,
    });

    // All four directives it actually uses. Each was discovered only after the
    // previous was unblocked, because the browser reports whichever the beacon
    // reaches first — so this asserts the whole set, not the one that happened
    // to be in the console that day.
    expect(directive(csp, 'connect-src')).toContain('https://ep1.adtrafficquality.google');
    expect(directive(csp, 'frame-src')).toContain('https://ep1.adtrafficquality.google');
    expect(directive(csp, 'img-src')).toContain('https://ep1.adtrafficquality.google');
  });

  it('does not name the beacon when AdSense is off', () => {
    // The ad hosts are added only when AdSense can actually load; a policy that
    // names them regardless would widen the surface of an install serving no ads.
    const csp = buildContentSecurityPolicy({
      nonce: 'n',
      isDev: false,
      adsenseEnabled: false,
      upgradeInsecureRequests: true,
    });

    expect(directive(csp, 'connect-src')).not.toContain('adtrafficquality');
  });

  it('names the beacon in development script-src, where strict-dynamic is absent', () => {
    // Production needs no entry: strict-dynamic lets the nonce-trusted loader
    // vouch for the scripts it inserts. Development has no such help, so the
    // beacon's sodar2.js is blocked and the console fills with errors that read
    // like a broken ad integration.
    const csp = buildContentSecurityPolicy({
      nonce: 'n',
      isDev: true,
      adsenseEnabled: true,
      upgradeInsecureRequests: false,
    });

    expect(directive(csp, 'script-src')).toContain('https://ep2.adtrafficquality.google');
  });
});
