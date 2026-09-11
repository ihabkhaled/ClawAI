import { describe, expect, it, vi } from 'vitest';

import { YANDEX_SITE_VERIFICATION } from '@/constants/site-metadata.constants';

vi.mock('@/lib/site/site-config', () => ({
  getSiteUrl: (): string => 'https://claw.example',
}));

describe('buildRootMetadata', () => {
  it('publishes a branded large-image preview for every application route', async () => {
    vi.stubEnv('NEXT_PUBLIC_ADSENSE_CLIENT_ID', 'ca-pub-2415314275784926');
    const { buildRootMetadata } = await import('@/lib/seo/root-metadata');
    const metadata = buildRootMetadata();

    expect(metadata.metadataBase?.toString()).toBe('https://claw.example/');
    expect(metadata.openGraph).toEqual(
      expect.objectContaining({
        siteName: 'ClawAI',
        title: expect.any(String),
        description: expect.any(String),
        images: [
          expect.objectContaining({
            url: '/clawai-social-preview.png',
            width: 1200,
            height: 630,
            alt: expect.stringContaining('ClawAI'),
          }),
        ],
      }),
    );
    expect(metadata.twitter).toEqual(
      expect.objectContaining({
        card: 'summary_large_image',
        images: ['/clawai-social-preview.png'],
      }),
    );
    expect(metadata.other).toBeUndefined();
  });

  // Yandex Webmaster verifies domain ownership by fetching the page and
  // reading this exact value back out of the rendered <head>. Next.js's
  // `verification.yandex` field is what renders
  // `<meta name="yandex-verification" content="...">` on every route,
  // root layout included, which is where Yandex expects to find it.
  it('carries the Yandex Webmaster verification token on every route', async () => {
    vi.stubEnv('NEXT_PUBLIC_ADSENSE_CLIENT_ID', 'ca-pub-2415314275784926');
    const { buildRootMetadata } = await import('@/lib/seo/root-metadata');
    const metadata = buildRootMetadata();

    expect(metadata.verification).toEqual({ yandex: YANDEX_SITE_VERIFICATION });
  });
});
