import { unstable_doesMiddlewareMatch } from 'next/experimental/testing/server';
import { NextRequest } from 'next/server';
import { describe, expect, it } from 'vitest';

import { config, proxy } from '../proxy';

const middleware = proxy;

function buildRequest(pathname: string, headers?: HeadersInit): NextRequest {
  return new NextRequest(new URL(pathname, 'https://claw.example'), { headers });
}

describe('middleware X-Robots-Tag enforcement', () => {
  it('explicitly excludes crawler discovery files from middleware', () => {
    const matchers = config.matcher.join('\n');

    expect(matchers).toContain('ads\\.txt');
    expect(matchers).toContain('robots\\.txt');
    expect(matchers).toContain('sitemap\\.xml');
    for (const path of ['/ads.txt', '/robots.txt', '/sitemap.xml']) {
      expect(
        unstable_doesMiddlewareMatch({
          config,
          nextConfig: {},
          url: `https://claw.example${path}`,
        }),
      ).toBe(false);
    }
  });

  it('does not tag the public homepage as noindex', () => {
    const response = middleware(buildRequest('/en'));
    expect(response.headers.get('X-Robots-Tag')).toBeNull();
  });

  it('serves the root homepage directly in English', () => {
    const response = middleware(buildRequest('/'));

    expect(response.status).toBe(200);
    expect(response.headers.get('location')).toBeNull();
    expect(response.headers.get('x-middleware-request-x-claw-locale')).toBe('en');
    expect(response.headers.get('X-Robots-Tag')).toBeNull();
  });

  it('preserves explicit English and Arabic homepage routes', () => {
    const english = middleware(buildRequest('/en'));
    const arabic = middleware(buildRequest('/ar'));

    expect(english.status).toBe(200);
    expect(english.headers.get('x-middleware-rewrite')).toBe('https://claw.example/');
    expect(arabic.status).toBe(200);
    expect(arabic.headers.get('x-middleware-rewrite')).toBe('https://claw.example/');
  });

  it('renders the internal locale rewrite without redirecting back to the public path', () => {
    const localized = middleware(buildRequest('/en/login'));
    const locale = localized.headers.get('x-middleware-request-x-claw-locale');
    const rewriteMarker = localized.headers.get('x-middleware-request-x-claw-locale-rewrite');

    expect(locale).toBe('en');
    expect(rewriteMarker).toBe('1');

    const internal = middleware(
      buildRequest('/login', {
        'x-claw-locale': locale ?? '',
        'x-claw-locale-rewrite': rewriteMarker ?? '',
      }),
    );

    expect(internal.status).toBe(200);
    expect(internal.headers.get('location')).toBeNull();
  });

  it('tags every portal route as noindex', () => {
    for (const path of ['/en/chat', '/en/dashboard', '/en/admin/plans', '/en/settings']) {
      const response = middleware(buildRequest(path));
      expect(response.headers.get('X-Robots-Tag')).toBe('noindex, nofollow, noarchive');
    }
  });

  it('tags auth routes as noindex', () => {
    const response = middleware(buildRequest('/en/login'));
    expect(response.headers.get('X-Robots-Tag')).toBe('noindex, nofollow, noarchive');
  });

  it('tags an unregistered/unknown route as noindex by default', () => {
    const response = middleware(buildRequest('/en/totally-unknown-path'));
    expect(response.headers.get('X-Robots-Tag')).toBe('noindex, nofollow, noarchive');
  });

  it('permanently redirects an unprefixed human route to English', () => {
    const response = middleware(buildRequest('/contact'));

    expect(response.status).toBe(308);
    expect(response.headers.get('location')).toBe('https://claw.example/en/contact');
  });

  it('canonicalizes supported uppercase locale segments', () => {
    const response = middleware(buildRequest('/JA/contact'));

    expect(response.status).toBe(308);
    expect(response.headers.get('location')).toBe('https://claw.example/ja/contact');
  });

  it('runs middleware for every localized RSS endpoint', () => {
    const localizedFeeds = [
      { path: '/ja/feed.xml', rewrittenPath: '/feed.xml' },
      { path: '/ar/feeds/topics.xml', rewrittenPath: '/feeds/topics.xml' },
      { path: '/de/feeds/chats.xml', rewrittenPath: '/feeds/chats.xml' },
    ];

    for (const { path, rewrittenPath } of localizedFeeds) {
      expect(
        unstable_doesMiddlewareMatch({
          config,
          nextConfig: {},
          url: `https://claw.example${path}`,
        }),
      ).toBe(true);
      expect(middleware(buildRequest(path)).headers.get('x-middleware-rewrite')).toBe(
        `https://claw.example${rewrittenPath}`,
      );
    }
  });

  it('does not upgrade subresources when serving an HTTP origin', () => {
    const response = middleware(new NextRequest(new URL('/en/contact', 'http://localhost:3000')));

    expect(response.headers.get('content-security-policy')).not.toContain(
      'upgrade-insecure-requests',
    );
  });
});
