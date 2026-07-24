import { NextRequest } from 'next/server';
import { describe, expect, it } from 'vitest';

import { middleware } from '../middleware';

function buildRequest(pathname: string): NextRequest {
  return new NextRequest(new URL(pathname, 'https://claw.example'));
}

describe('middleware X-Robots-Tag enforcement', () => {
  it('does not tag the public homepage as noindex', () => {
    const response = middleware(buildRequest('/'));
    expect(response.headers.get('X-Robots-Tag')).toBeNull();
  });

  it('tags every portal route as noindex', () => {
    for (const path of ['/chat', '/dashboard', '/admin/plans', '/settings']) {
      const response = middleware(buildRequest(path));
      expect(response.headers.get('X-Robots-Tag')).toBe('noindex, nofollow, noarchive');
    }
  });

  it('tags auth routes as noindex', () => {
    const response = middleware(buildRequest('/login'));
    expect(response.headers.get('X-Robots-Tag')).toBe('noindex, nofollow, noarchive');
  });

  it('tags an unregistered/unknown route as noindex by default', () => {
    const response = middleware(buildRequest('/totally-unknown-path'));
    expect(response.headers.get('X-Robots-Tag')).toBe('noindex, nofollow, noarchive');
  });
});
