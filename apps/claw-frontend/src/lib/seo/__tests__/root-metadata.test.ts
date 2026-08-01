import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/site/site-config', () => ({
  getSiteUrl: (): string => 'https://claw.example',
}));

describe('buildRootMetadata', () => {
  it('publishes a branded large-image preview for every application route', async () => {
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
            url: '/opengraph-image',
            width: 1200,
            height: 630,
            alt: expect.stringContaining('ClawAI'),
          }),
        ],
      }),
    );
    expect(metadata.twitter).toEqual(
      expect.objectContaining({ card: 'summary_large_image', images: ['/opengraph-image'] }),
    );
  });
});
