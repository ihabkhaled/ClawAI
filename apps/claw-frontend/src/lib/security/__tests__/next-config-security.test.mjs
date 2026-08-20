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
