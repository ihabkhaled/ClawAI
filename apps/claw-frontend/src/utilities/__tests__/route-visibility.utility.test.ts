import { describe, expect, it } from 'vitest';

import { isPublicPath } from '@/utilities/route-visibility.utility';

describe('isPublicPath', () => {
  it('treats the homepage as public', () => {
    expect(isPublicPath('/')).toBe(true);
  });

  it('treats framework crawler files as public', () => {
    expect(isPublicPath('/robots.txt')).toBe(true);
    expect(isPublicPath('/sitemap.xml')).toBe(true);
    expect(isPublicPath('/manifest.webmanifest')).toBe(true);
    expect(isPublicPath('/opengraph-image')).toBe(true);
  });

  it('treats every portal route as private', () => {
    for (const path of ['/chat', '/dashboard', '/admin', '/settings', '/memory']) {
      expect(isPublicPath(path)).toBe(false);
    }
  });

  it('treats auth routes as private', () => {
    expect(isPublicPath('/login')).toBe(false);
    expect(isPublicPath('/register')).toBe(false);
  });

  it('defaults an unregistered/unknown path to private', () => {
    expect(isPublicPath('/this-route-does-not-exist')).toBe(false);
  });
});
