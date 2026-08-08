import { unstable_doesMiddlewareMatch } from 'next/experimental/testing/server';
import { NextRequest } from 'next/server';
import { describe, expect, it } from 'vitest';

import { config, middleware } from '../middleware';

function buildRequest(pathname: string): NextRequest {
  return new NextRequest(new URL(pathname, 'https://claw.example'));
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
