import { describe, expect, it } from 'vitest';

import nextConfig from '../../../../next.config.mjs';

describe('billing popup isolation headers', () => {
  it.each(['/:locale/billing', '/:locale/billing/:path*', '/billing', '/billing/:path*'])(
    'allows the PayPal opener relationship on %s',
    async (source) => {
      const rules = await nextConfig.headers();
      const rule = rules.find((candidate) => candidate.source === source);

      expect(rule?.headers).toContainEqual({
        key: 'Cross-Origin-Opener-Policy',
        value: 'same-origin-allow-popups',
      });
    },
  );
});

describe('development backend proxy', () => {
  it('is disabled unless an explicit target is configured', async () => {
    delete process.env.CLAW_DEV_API_PROXY_TARGET;

    expect(await nextConfig.rewrites()).toEqual([]);
  });

  it('forwards API routes only to the explicitly configured target', async () => {
    process.env.CLAW_DEV_API_PROXY_TARGET = 'https://claw.local';

    await expect(nextConfig.rewrites()).resolves.toEqual([
      {
        source: '/api/v1/:path*',
        destination: 'https://claw.local/api/v1/:path*',
      },
    ]);

    delete process.env.CLAW_DEV_API_PROXY_TARGET;
  });
});

// Regression (QA 2026-09-23): `camera=(), microphone=()` made getUserMedia
// throw a permissions-policy violation on our own origin, so the chat recorder
// could never start in any browser. Same-origin only; no third-party frame.
describe('permissions policy', () => {
  it('lets our own pages use the microphone and camera, and nobody else', async () => {
    const rules = await nextConfig.headers();
    const policy = rules
      .flatMap((rule) => rule.headers)
      .find((header) => header.key === 'Permissions-Policy');

    expect(policy?.value).toContain('microphone=(self)');
    expect(policy?.value).toContain('camera=(self)');
    expect(policy?.value).toContain('geolocation=()');
    expect(policy?.value).not.toMatch(/(?:microphone|camera)=\*/u);
  });
});
