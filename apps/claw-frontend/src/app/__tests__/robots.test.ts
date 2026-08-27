import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// First dynamic import of a route module in a cold vitest worker compiles a
// large chunk of the app's module graph — generous timeout is about
// cold-compile cost, not slow logic.
const DYNAMIC_IMPORT_TIMEOUT_MS = 20_000;

describe('robots', () => {
  it('is rendered at request time so production runtime configuration controls crawling', async () => {
    const route = await import('../robots');
    expect(route.dynamic).toBe('force-dynamic');
  });

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
      expect(disallow).toContain('/billing');
      for (const prefix of PRIVATE_ROUTE_PREFIXES) {
        expect(disallow).toContain(prefix);
      }
    },
    DYNAMIC_IMPORT_TIMEOUT_MS,
  );

  it(
    'names the AI answer engines explicitly, with the same private routes withheld',
    async () => {
      vi.stubEnv('NODE_ENV', 'production');
      process.env['SITE_URL'] = 'https://claw.example';
      const { PRIVATE_ROUTE_PREFIXES } = await import('@/constants');
      const { AI_ANSWER_ENGINE_CRAWLERS, AI_TRAINING_CRAWLERS, WEB_SEARCH_CRAWLERS } =
        await import('@/constants/crawler-policy.constants');
      const robots = (await import('../robots')).default;

      const rules = robots().rules;
      if (!Array.isArray(rules)) {
        throw new Error('expected a group per named crawler set');
      }
      const agents = rules.flatMap((rule) =>
        typeof rule.userAgent === 'string' ? [rule.userAgent] : (rule.userAgent ?? []),
      );
      // The whole point of the change: ChatGPT Search, Claude and Perplexity
      // have no submission form. Being fetchable IS the opt-in.
      expect(agents).toContain('OAI-SearchBot');
      expect(agents).toContain('Claude-SearchBot');
      expect(agents).toContain('PerplexityBot');
      expect(agents).toContain('Google-Extended');

      // A named group is read INSTEAD of `*`, never in addition to it. A group
      // that forgot the disallow list would invite the named bot into the
      // portal — the one mistake this whole file exists to prevent.
      for (const rule of rules) {
        expect(rule.allow).toContain('/');
        for (const prefix of PRIVATE_ROUTE_PREFIXES) {
          expect(rule.disallow).toContain(prefix);
        }
      }

      const named = [...WEB_SEARCH_CRAWLERS, ...AI_ANSWER_ENGINE_CRAWLERS, ...AI_TRAINING_CRAWLERS];
      expect(new Set(named).size).toBe(named.length);
      expect(rules).toHaveLength(4);
    },
    DYNAMIC_IMPORT_TIMEOUT_MS,
  );

  it(
    'disallows everything in non-canonical environments',
    async () => {
      vi.stubEnv('NODE_ENV', 'production');
      vi.stubEnv('VERCEL_ENV', 'preview');
      process.env['SITE_URL'] = 'https://claw.example';
      const robots = (await import('../robots')).default;

      const result = robots();
      const rules = Array.isArray(result.rules) ? result.rules[0] : result.rules;
      expect(rules?.disallow).toBe('/');
    },
    DYNAMIC_IMPORT_TIMEOUT_MS,
  );
});
