import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// First dynamic import of a route module in a cold vitest worker compiles a
// large chunk of the app's module graph — generous timeout is about
// cold-compile cost, not slow logic.
const DYNAMIC_IMPORT_TIMEOUT_MS = 20_000;

// The dynamic half of the sitemap is fetched from chat-service. Stubbed here so
// these assertions are about the sitemap's own composition, not about the network.
const mockListIndexableChatShares = vi.fn();

vi.mock('@/lib/chat-shares/public-chat-share.service', () => ({
  listIndexableChatShares: (): unknown => mockListIndexableChatShares(),
}));

describe('sitemap', () => {
  beforeEach(() => {
    vi.resetModules();
    mockListIndexableChatShares.mockReset();
    mockListIndexableChatShares.mockResolvedValue([]);
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

      const urls = (await sitemap()).map((entry) => entry.url).sort();
      expect(expected.length).toBeGreaterThan(1);
      expect(urls).toEqual(expected);
    },
    DYNAMIC_IMPORT_TIMEOUT_MS,
  );

  it(
    'appends indexable shared chats after the static pages',
    async () => {
      vi.stubEnv('NODE_ENV', 'production');
      process.env['SITE_URL'] = 'https://claw.example';
      mockListIndexableChatShares.mockResolvedValue([
        { publicShareId: 'AbCdEfGhIjKlMnOpQrStUv', updatedAt: '2026-07-20T10:00:00.000Z' },
      ]);
      const sitemap = (await import('../sitemap')).default;

      const entries = await sitemap();

      expect(entries.map((entry) => entry.url)).toContain(
        'https://claw.example/share/chat/AbCdEfGhIjKlMnOpQrStUv',
      );
    },
    DYNAMIC_IMPORT_TIMEOUT_MS,
  );

  it(
    'still returns the static pages when the shared-chat feed yields nothing',
    async () => {
      // A chat-service outage must cost the dynamic entries and nothing else. A
      // sitemap that fails outright would take the static pages down with it.
      vi.stubEnv('NODE_ENV', 'production');
      process.env['SITE_URL'] = 'https://claw.example';
      mockListIndexableChatShares.mockResolvedValue([]);
      const sitemap = (await import('../sitemap')).default;

      const entries = await sitemap();

      expect(entries.length).toBeGreaterThan(1);
      expect(entries.every((entry) => !entry.url.includes('/share/chat/'))).toBe(true);
    },
    DYNAMIC_IMPORT_TIMEOUT_MS,
  );

  it(
    'is empty in non-canonical environments',
    async () => {
      vi.stubEnv('NODE_ENV', 'development');
      const sitemap = (await import('../sitemap')).default;

      expect(await sitemap()).toEqual([]);
    },
    DYNAMIC_IMPORT_TIMEOUT_MS,
  );

  it(
    'does not even query the shared-chat feed in a non-canonical environment',
    async () => {
      // A preview deployment must not publish its own URLs, and must not spend a
      // chat-service round trip discovering ones it will discard.
      vi.stubEnv('NODE_ENV', 'development');
      const sitemap = (await import('../sitemap')).default;

      await sitemap();

      expect(mockListIndexableChatShares).not.toHaveBeenCalled();
    },
    DYNAMIC_IMPORT_TIMEOUT_MS,
  );
});
