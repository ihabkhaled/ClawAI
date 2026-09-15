import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { getAdEligiblePaths } from '@/utilities/content-registry.utility';

import { AdSenseScriptLoader } from '../adsense-script-loader';

// The real registry-derived list the server passes in production.
const ELIGIBLE_PATHS = getAdEligiblePaths();

let mockPathname = '/';
let mockIsIdle = true;

vi.mock('@/hooks/common/use-idle-deferred', () => ({
  useIdleDeferred: (): boolean => mockIsIdle,
}));

vi.mock('next/navigation', () => ({
  usePathname: (): string => mockPathname,
}));

// renderToStaticMarkup (not @testing-library's DOM render) on purpose: a raw
// <script src> is a React "hoistable" element that gets committed into the
// real document <head> and is NOT cleaned up on unmount, so it would persist
// in jsdom across every later test in this file if actually mounted.
// Rendering to a string sidesteps that entirely.
describe('AdSenseScriptLoader', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    mockPathname = '/';
    mockIsIdle = true;
  });

  it('renders the loader script on the eligible homepage once the browser is idle', () => {
    vi.stubEnv('NEXT_PUBLIC_ADSENSE_CLIENT_ID', 'ca-pub-2415314275784926');
    vi.stubEnv('NEXT_PUBLIC_ADSENSE_SERVING_ENABLED', 'true');
    mockPathname = '/';
    mockIsIdle = true;

    const html = renderToStaticMarkup(
      <AdSenseScriptLoader nonce="test-nonce" eligiblePaths={ELIGIBLE_PATHS} />,
    );

    expect(html).toContain('adsbygoogle.js');
    expect(html).toContain('nonce="test-nonce"');
  });

  it('emits nothing until the browser is idle, so it cannot block hydration', () => {
    // The tag is deferred, never dropped — useIdleDeferred always flips true.
    vi.stubEnv('NEXT_PUBLIC_ADSENSE_CLIENT_ID', 'ca-pub-2415314275784926');
    vi.stubEnv('NEXT_PUBLIC_ADSENSE_SERVING_ENABLED', 'true');
    mockPathname = '/';
    mockIsIdle = false;

    expect(
      renderToStaticMarkup(
        <AdSenseScriptLoader nonce="test-nonce" eligiblePaths={ELIGIBLE_PATHS} />,
      ),
    ).toBe('');
  });

  it.each([
    ['portal chat', '/chat'],
    ['dashboard', '/dashboard'],
    ['login', '/login'],
    ['register', '/register'],
    ['billing', '/billing'],
    ['settings', '/settings'],
    ['admin', '/admin'],
    ['an unregistered/unknown page', '/this-page-does-not-exist'],
    ['a public shared chat', '/en/share/chat/AbCdEfGhIjKlMnOpQrStUv'],
  ])('never renders the loader script on %s', (_label, path) => {
    vi.stubEnv('NEXT_PUBLIC_ADSENSE_CLIENT_ID', 'ca-pub-2415314275784926');
    vi.stubEnv('NEXT_PUBLIC_ADSENSE_SERVING_ENABLED', 'true');
    vi.stubEnv('NEXT_PUBLIC_ADSENSE_REVIEW_MODE', 'true');
    mockPathname = path;

    const html = renderToStaticMarkup(
      <AdSenseScriptLoader nonce="test-nonce" eligiblePaths={ELIGIBLE_PATHS} />,
    );

    expect(html).not.toContain('adsbygoogle.js');
  });

  it('renders nothing when no client id is configured, regardless of path', () => {
    mockPathname = '/';

    const html = renderToStaticMarkup(
      <AdSenseScriptLoader nonce="test-nonce" eligiblePaths={ELIGIBLE_PATHS} />,
    );

    expect(html).toBe('');
  });
});
