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
        'x-default': 'https://claw.example/en/features',
      },
    });
    expect(metadata.openGraph).toEqual(
      expect.objectContaining({
        locale: 'en_US',
        url: 'https://claw.example/en/features',
      }),
    );
    expect(metadata.robots).toEqual(expect.objectContaining({ index: true, follow: true }));
  });

  it('fails closed for an untranslated localized page', async () => {
    const { buildPublicPageMetadata } = await import('@/lib/seo/public-page-metadata');
    const metadata = buildPublicPageMetadata('features', Locale.JA);

    expect(metadata.alternates).toEqual(
      expect.objectContaining({ canonical: 'https://claw.example/ja' }),
    );
    expect(metadata.robots).toEqual(
      expect.objectContaining({ index: false, follow: false, noarchive: true }),
    );
  });
});
