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
