import { describe, expect, it } from 'vitest';

import { isPublicPath } from '@/utilities/route-visibility.utility';

describe('isPublicPath', () => {
  it('treats the homepage as public', () => {
    expect(isPublicPath('/en')).toBe(true);
  });

  it('recognises every localized public URL', () => {
    expect(isPublicPath('/ja')).toBe(true);
    expect(isPublicPath('/fa/features')).toBe(true);
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

  it('treats a shared-chat page as a public route', () => {
    // A visitor following a shared link has no account, so the route must
    // bypass the login redirect and must not be blanket-tagged noindex at the
    // middleware layer — an INDEXED share is supposed to be indexable.
    expect(isPublicPath('/en/share/chat/AbCdEfGhIjKlMnOpQrStUv')).toBe(true);
  });

  it('does not treat the shared-chat prefix itself as a page', () => {
    // Only a share WITH an identifier is a page. /share and /share/chat are
    // not routes, so they stay private and noindex like any unknown path.
    expect(isPublicPath('/share')).toBe(false);
    expect(isPublicPath('/share/chat')).toBe(false);
  });

  it('says nothing about whether a specific share is live', () => {
    // Route-level publicness is not share-level availability. A syntactically
    // valid but revoked or nonexistent identifier still matches the route here;
    // the 404 and the ad gating are decided by the server per share.
    expect(isPublicPath('/en/share/chat/definitely-not-a-real-id')).toBe(true);
  });
});
