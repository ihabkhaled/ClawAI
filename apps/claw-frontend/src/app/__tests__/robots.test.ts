import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// First dynamic import of a route module in a cold vitest worker compiles a
// large chunk of the app's module graph — generous timeout is about
// cold-compile cost, not slow logic.
const DYNAMIC_IMPORT_TIMEOUT_MS = 20_000;

describe('robots', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    delete process.env['SITE_URL'];
    delete process.env['VERCEL_ENV'];
  });

  it(
    'allows every crawler to fetch public and localized shared-chat URLs',
    async () => {
      vi.stubEnv('NODE_ENV', 'production');
      process.env['SITE_URL'] = 'https://claw.example';
      const { PRIVATE_ROUTE_PREFIXES } = await import('@/constants');
      const { SUPPORTED_LOCALES } = await import('@/lib/i18n/i18n.constants');
      const robots = (await import('../robots')).default;

      const result = robots();
      expect(result.sitemap).toBe('https://claw.example/sitemap.xml');
      const rules = Array.isArray(result.rules) ? result.rules[0] : result.rules;
      expect(rules?.userAgent).toBe('*');
      expect(rules?.allow).toContain('/');
      for (const { locale } of SUPPORTED_LOCALES) {
        expect(rules?.allow).toContain(`/${locale}/share/chat/`);
      }

      const disallow = rules?.disallow;
      for (const prefix of PRIVATE_ROUTE_PREFIXES) {
        expect(disallow).toContain(prefix);
      }
    },
    DYNAMIC_IMPORT_TIMEOUT_MS,
  );

  it(
    'disallows everything in non-canonical environments',
    async () => {
      vi.stubEnv('NODE_ENV', 'development');
      const robots = (await import('../robots')).default;

      const result = robots();
      const rules = Array.isArray(result.rules) ? result.rules[0] : result.rules;
      expect(rules?.disallow).toBe('/');
    },
    DYNAMIC_IMPORT_TIMEOUT_MS,
  );
});
