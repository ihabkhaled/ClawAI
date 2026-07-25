import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// First dynamic import of a route module in a cold vitest worker compiles a
// large chunk of the app's module graph — generous timeout is about
// cold-compile cost, not slow logic.
const DYNAMIC_IMPORT_TIMEOUT_MS = 20_000;

describe('sitemap', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    delete process.env['SITE_URL'];
    delete process.env['VERCEL_ENV'];
  });

  it(
    'contains every published+indexable page as a fully-qualified URL in production',
    async () => {
      vi.stubEnv('NODE_ENV', 'production');
      process.env['SITE_URL'] = 'https://claw.example';
      const sitemap = (await import('../sitemap')).default;

      const { getIndexablePages } = await import('@/utilities/content-registry.utility');
      // Derived, not hardcoded: the property under test is that the sitemap is
      // exactly the indexable set rendered as absolute URLs. Which pages are
      // indexable in the first place is asserted explicitly in
      // content-registry.utility.test.ts.
      const expected = getIndexablePages()
        .map((page) => `https://claw.example${page.canonicalPath}`)
        .sort();

      const urls = sitemap()
        .map((entry) => entry.url)
        .sort();
      expect(expected.length).toBeGreaterThan(1);
      expect(urls).toEqual(expected);
    },
    DYNAMIC_IMPORT_TIMEOUT_MS,
  );

  it(
    'is empty in non-canonical environments',
    async () => {
      vi.stubEnv('NODE_ENV', 'development');
      const sitemap = (await import('../sitemap')).default;

      expect(sitemap()).toEqual([]);
    },
    DYNAMIC_IMPORT_TIMEOUT_MS,
  );
});
