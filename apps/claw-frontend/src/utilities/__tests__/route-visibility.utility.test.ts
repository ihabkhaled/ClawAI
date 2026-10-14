import { describe, expect, it } from 'vitest';

import { isPublicPath, isPublicThreadPath } from '@/utilities/route-visibility.utility';

describe('isPublicPath', () => {
  it('treats the homepage as public', () => {
    expect(isPublicPath('/')).toBe(true);
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

  it('treats a public Thread page as a public route, so it is not tagged noindex by the proxy', () => {
    // An index-eligible Thread is meant to be found. The page itself 404s anything unpublished.
    expect(isPublicPath('/en/threads/7f0c1d2e-3a4b-4c5d-8e6f-0a1b2c3d4e5f')).toBe(true);
    expect(isPublicPath('/ar/threads/clear-writing')).toBe(true);
  });

  it('treats the public Threads board as public and the owner portal as private', () => {
    expect(isPublicPath('/en/threads/board')).toBe(true);
    expect(isPublicPath('/en/threads/discover')).toBe(true);
    expect(isPublicPath('/en/threads')).toBe(false);
    expect(isPublicPath('/en/threads/review/abc')).toBe(false);
    expect(isPublicPath('/threads')).toBe(false);
  });

  it('only matches one slug segment of safe characters', () => {
    expect(isPublicThreadPath('/en/threads/a-b-1')).toBe(true);
    expect(isPublicThreadPath('/en/threads/a/b')).toBe(false);
    expect(isPublicThreadPath('/en/threads/a_b')).toBe(false);
    expect(isPublicThreadPath('/en/threads/%2e%2e')).toBe(false);
    expect(isPublicThreadPath('/en/threads/')).toBe(false);
    expect(isPublicThreadPath(`/en/threads/${'a'.repeat(65)}`)).toBe(false);
  });

  it.each([
    ['Arabic', 'كيف-يعمل-التمثيل-a1b2c3d4'],
    ['Persian', 'فتوسنتز-در-گیاهان-a1b2c3d4'],
    ['Hindi', 'प्रकाश-संश्लेषण-a1b2c3d4'],
    ['Japanese', '茶道-入門-a1b2c3d4'],
  ])(
    'treats a percent-encoded %s Thread path as public (the proxy sees it encoded)',
    (_name, slug) => {
      const encoded = encodeURIComponent(slug);
      expect(isPublicThreadPath(`/ar/threads/${encoded}`)).toBe(true);
      expect(isPublicPath(`/en/threads/${encoded}`)).toBe(true);
      expect(isPublicThreadPath(`/ar/threads/${slug}`)).toBe(true);
    },
  );

  it('rejects malformed encoding and an encoded slash in a Thread path', () => {
    expect(isPublicThreadPath('/en/threads/%E0%A4%A')).toBe(false);
    expect(isPublicThreadPath('/en/threads/a%2Fb')).toBe(false);
  });

  it('does not make an unlocalised Thread path public (the proxy redirects it first)', () => {
    expect(isPublicPath('/threads/clear-writing')).toBe(false);
  });
});
