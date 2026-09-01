import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('next/headers', () => ({
  headers: (): Promise<Headers> => Promise.resolve(new Headers({ 'x-nonce': 'test-nonce' })),
}));

// AdSenseScriptLoader owns the pathname-eligibility decision (see its own
// test file); AdSenseHead only needs to prove it renders the loader at all
// alongside the verification meta tag, so the loader is stubbed here.
vi.mock('@/components/adsense/adsense-script-loader', () => ({
  AdSenseScriptLoader: ({ nonce }: { nonce: string | undefined }): React.ReactElement => (
    <script data-testid="stub-loader" nonce={nonce} />
  ),
}));

describe('AdSenseHead', () => {
  afterEach(() => vi.unstubAllEnvs());

  it('renders the verification meta tag and delegates the loader when configured', async () => {
    vi.stubEnv('NEXT_PUBLIC_ADSENSE_CLIENT_ID', 'ca-pub-2415314275784926');
    vi.stubEnv('NEXT_PUBLIC_ADSENSE_REVIEW_MODE', 'true');
    const { AdSenseHead } = await import('../adsense-head');

    const html = renderToStaticMarkup(await AdSenseHead());

    expect(html.match(/google-adsense-account/gu)).toHaveLength(1);
    expect(html).toContain('content="ca-pub-2415314275784926"');
    expect(html).toContain('data-testid="stub-loader"');
    expect(html).toContain('nonce="test-nonce"');
  });

  it('renders nothing when no client id is configured', async () => {
    const { AdSenseHead } = await import('../adsense-head');

    const result = await AdSenseHead();

    expect(result).toBeNull();
  });

  it('renders nothing when configured but neither review nor serving is enabled', async () => {
    vi.stubEnv('NEXT_PUBLIC_ADSENSE_CLIENT_ID', 'ca-pub-2415314275784926');
    const { AdSenseHead } = await import('../adsense-head');

    const result = await AdSenseHead();

    expect(result).toBeNull();
  });
});
