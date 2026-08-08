import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('next/headers', () => ({
  headers: (): Promise<Headers> => Promise.resolve(new Headers({ 'x-nonce': 'test-nonce' })),
}));

describe('AdSenseHead', () => {
  afterEach(() => vi.unstubAllEnvs());

  it('renders one global account meta and one nonce-authorized loader', async () => {
    vi.stubEnv('NEXT_PUBLIC_ADSENSE_CLIENT_ID', 'ca-pub-2415314275784926');
    vi.stubEnv('NEXT_PUBLIC_ADSENSE_REVIEW_MODE', 'true');
    const { AdSenseHead } = await import('../adsense-head');

    const html = renderToStaticMarkup(await AdSenseHead());

    expect(html.match(/google-adsense-account/gu)).toHaveLength(1);
    expect(
      html.match(/pagead2\.googlesyndication\.com\/pagead\/js\/adsbygoogle\.js/gu),
    ).toHaveLength(1);
    expect(html).toContain('content="ca-pub-2415314275784926"');
    expect(html).toContain('nonce="test-nonce"');
  });
});
