import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const DYNAMIC_IMPORT_TIMEOUT_MS = 20_000;

// /llms.txt is a convenience index for an assistant that has landed on the
// domain. It is generated from the content registry, never hand-maintained, so
// the property under test is "it cannot drift": every URL it names is a real
// indexable page, and a deployment that is not the canonical origin publishes
// nothing at all rather than a map of a site it is not.
describe('llms.txt', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    delete process.env['SITE_URL'];
    delete process.env['VERCEL_ENV'];
  });

  it('is rendered at request time so runtime configuration controls it', async () => {
    const route = await import('../llms.txt/route');
    expect(route.dynamic).toBe('force-dynamic');
  });

  it(
    'lists every indexable English page and the machine-readable indexes',
    async () => {
      vi.stubEnv('NODE_ENV', 'production');
      process.env['SITE_URL'] = 'https://claw.example';
      const { GET } = await import('../llms.txt/route');
      const { getIndexablePagesForLocale } = await import('@/utilities/content-registry.utility');
      const { Locale } = await import('@/enums/locale.enum');

      const response = GET();
      const body = await response.text();

      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toBe('text/plain; charset=utf-8');
      expect(body.startsWith('# ClawAI')).toBe(true);
      for (const page of getIndexablePagesForLocale(Locale.EN)) {
        // The home page is the blockquote summary rather than a list item.
        if (page.canonicalPath === '/en') {
          continue;
        }
        expect(body).toContain(`https://claw.example${page.canonicalPath}`);
      }
      expect(body).toContain('https://claw.example/sitemap.xml');
      expect(body).toContain('https://claw.example/rss.xml');
    },
    DYNAMIC_IMPORT_TIMEOUT_MS,
  );

  it(
    'groups the comparison pages under their own heading',
    async () => {
      vi.stubEnv('NODE_ENV', 'production');
      process.env['SITE_URL'] = 'https://claw.example';
      const { GET } = await import('../llms.txt/route');

      const body = await GET().text();

      expect(body).toContain('## Comparisons');
      expect(body).toContain('https://claw.example/en/compare/chatgpt');
      expect(body).toContain('https://claw.example/en/compare/claude');
      expect(body).toContain('https://claw.example/en/compare/gemini');
      expect(body).toContain('https://claw.example/en/compare/perplexity');
      expect(body).toContain('https://claw.example/en/compare/copilot');
    },
    DYNAMIC_IMPORT_TIMEOUT_MS,
  );

  it(
    'states the independence disclaimer, so a summarising assistant repeats it',
    async () => {
      vi.stubEnv('NODE_ENV', 'production');
      process.env['SITE_URL'] = 'https://claw.example';
      const { GET } = await import('../llms.txt/route');

      const body = await GET().text();

      expect(body).toContain('independent');
      expect(body).toContain('not affiliated');
    },
    DYNAMIC_IMPORT_TIMEOUT_MS,
  );

  it(
    '404s rather than publishing an empty map on a non-canonical deployment',
    async () => {
      vi.stubEnv('NODE_ENV', 'production');
      vi.stubEnv('VERCEL_ENV', 'preview');
      process.env['SITE_URL'] = 'https://claw.example';
      const { GET } = await import('../llms.txt/route');

      expect(GET().status).toBe(404);
    },
    DYNAMIC_IMPORT_TIMEOUT_MS,
  );
});
