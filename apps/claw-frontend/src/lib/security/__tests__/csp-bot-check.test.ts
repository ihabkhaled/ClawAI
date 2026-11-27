import { describe, expect, it } from 'vitest';

import { buildContentSecurityPolicy } from '@/lib/security/content-security-policy';

function sources(csp: string, name: string): string[] {
  const directive = csp.split(';').find((entry) => entry.trim().startsWith(`${name} `)) ?? '';
  return directive.trim().split(/\s+/u).slice(1);
}

const base = { nonce: 'n0nce', adsenseEnabled: false, upgradeInsecureRequests: true };

// Turnstile and reCAPTCHA v3 on sign-up / sign-in (anti-abuse, 2026-11-27).
describe('CSP for the bot checks', () => {
  it.each([false, true])(
    'isDev=%s frames the Turnstile widget and the reCAPTCHA iframes',
    (isDev) => {
      const frameSrc = sources(buildContentSecurityPolicy({ ...base, isDev }), 'frame-src');
      expect(frameSrc).toContain('https://challenges.cloudflare.com');
      expect(frameSrc).toContain('https://www.google.com/recaptcha/');
      expect(frameSrc).toContain('https://recaptcha.google.com');
    },
  );

  it.each([false, true])('isDev=%s names both script hosts in script-src', (isDev) => {
    const scriptSrc = sources(buildContentSecurityPolicy({ ...base, isDev }), 'script-src');
    expect(scriptSrc).toContain('https://challenges.cloudflare.com');
    expect(scriptSrc).toContain('https://www.google.com/recaptcha/');
    expect(scriptSrc).toContain('https://www.gstatic.com/recaptcha/');
  });

  it('keeps production strict: nonce + strict-dynamic still lead, no wildcard, no unsafe-eval', () => {
    const scriptSrc = sources(buildContentSecurityPolicy({ ...base, isDev: false }), 'script-src');
    expect(scriptSrc.slice(0, 3)).toEqual(["'self'", "'nonce-n0nce'", "'strict-dynamic'"]);
    expect(scriptSrc).not.toContain("'unsafe-eval'");
    expect(scriptSrc).not.toContain('https:');
    expect(scriptSrc).not.toContain('https://www.google.com');
  });

  it('never widens connect-src or img-src for them', () => {
    const csp = buildContentSecurityPolicy({ ...base, isDev: false });
    for (const name of ['connect-src', 'img-src']) {
      expect(sources(csp, name).join(' ')).not.toContain('challenges.cloudflare.com');
      expect(sources(csp, name).join(' ')).not.toContain('recaptcha');
    }
  });

  it('lists each frame source once, with AdSense on or off', () => {
    for (const adsenseEnabled of [false, true]) {
      const frameSrc = sources(
        buildContentSecurityPolicy({ ...base, isDev: false, adsenseEnabled }),
        'frame-src',
      );
      expect(new Set(frameSrc).size).toBe(frameSrc.length);
    }
  });
});
