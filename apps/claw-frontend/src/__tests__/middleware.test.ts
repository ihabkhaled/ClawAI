import { NextRequest } from 'next/server';
import { describe, expect, it } from 'vitest';

import { middleware } from '../middleware';

function buildRequest(pathname: string): NextRequest {
  return new NextRequest(new URL(pathname, 'https://claw.example'));
}

describe('middleware X-Robots-Tag enforcement', () => {
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
});
