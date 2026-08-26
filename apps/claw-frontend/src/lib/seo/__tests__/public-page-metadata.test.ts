import { beforeEach, describe, expect, it, vi } from 'vitest';

import { Locale } from '@/enums/locale.enum';

vi.mock('@/lib/site/site-config', () => ({
  getSiteUrl: (): string => 'https://claw.example',
  shouldNoIndexEverything: (): boolean => false,
}));

describe('buildPublicPageMetadata', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('builds a localized canonical, reciprocal languages and x-default', async () => {
    const { buildPublicPageMetadata } = await import('@/lib/seo/public-page-metadata');
    const metadata = buildPublicPageMetadata('features', Locale.EN);

    expect(metadata.alternates).toEqual({
      canonical: 'https://claw.example/en/features',
      languages: {
        en: 'https://claw.example/en/features',
        ar: 'https://claw.example/ar/features',
        de: 'https://claw.example/de/features',
        es: 'https://claw.example/es/features',
        fa: 'https://claw.example/fa/features',
        fr: 'https://claw.example/fr/features',
        hi: 'https://claw.example/hi/features',
        it: 'https://claw.example/it/features',
        ja: 'https://claw.example/ja/features',
        pt: 'https://claw.example/pt/features',
        ru: 'https://claw.example/ru/features',
        th: 'https://claw.example/th/features',
        'zh-Hans': 'https://claw.example/zh/features',
        'x-default': 'https://claw.example/en/features',
      },
      types: {
        // Both feeds are advertised: the locale feed for a reader who wants
        // this language, the global one so a crawler landing on any single
        // localized page can still discover all thirteen.
        'application/rss+xml': [
          { url: 'https://claw.example/en/feed.xml', title: 'ClawAI — EN' },
          { url: 'https://claw.example/rss.xml', title: 'ClawAI — all languages' },
        ],
      },
    });
    expect(metadata.openGraph).toEqual(
      expect.objectContaining({
        locale: 'en_US',
        url: 'https://claw.example/en/features',
        images: [
          expect.objectContaining({
            url: 'https://claw.example/clawai-social-preview.png',
            alt: 'Routing, context, and orchestration features',
          }),
        ],
      }),
    );
    expect(metadata.robots).toEqual(expect.objectContaining({ index: true, follow: true }));
  });

  it('publishes canonical metadata for every supported locale', async () => {
    const { buildPublicPageMetadata } = await import('@/lib/seo/public-page-metadata');
    const metadata = buildPublicPageMetadata('features', Locale.JA);

    expect(metadata.alternates).toEqual(
      expect.objectContaining({ canonical: 'https://claw.example/ja/features' }),
    );
    expect(metadata.title).not.toBe('Features â€” ClawAI');
    expect(metadata.description).not.toContain('One subscription across Claude');
    expect(metadata.keywords).toEqual(expect.arrayContaining([expect.any(String)]));
    expect(metadata.robots).toEqual(expect.objectContaining({ index: true, follow: true }));
  });
});
