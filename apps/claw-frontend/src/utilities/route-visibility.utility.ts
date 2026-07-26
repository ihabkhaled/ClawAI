import { SHARE_CHAT_PATH_PREFIX } from '@/constants/chat-share.constants';
import { isKnownPublicPath } from '@/utilities/content-registry.utility';

// Framework-generated crawler files that are never registry entries but
// must never be tagged noindex either.
const STATIC_PUBLIC_PATHS: ReadonlyArray<string> = [
  '/robots.txt',
  '/sitemap.xml',
  '/manifest.webmanifest',
  '/icon.png',
  '/apple-icon.png',
  '/icon-maskable.png',
  '/opengraph-image',
  '/favicon.ico',
  '/ads.txt',
];

/**
 * Whether a path is a public shared-chat page.
 *
 * Prefix-matched because the identifier is dynamic and can never be a registry
 * entry. This says only "this ROUTE is public" — it deliberately says nothing
 * about whether the specific share is active, indexable, or ad-eligible. Those
 * are decided per-share by the server (`visibility`, `adsEligible`), which is why
 * a random string matching this prefix gets a 404 and no ads rather than a page.
 */
export function isSharedChatPath(pathname: string): boolean {
  return pathname.startsWith(`${SHARE_CHAT_PATH_PREFIX}/`);
}

// Single implementation of "unknown routes default to non-indexable":
// a path is public only if it is an explicitly PUBLISHED + INDEXABLE
// content-registry entry, one of the framework crawler files above, or a
// shared-chat page. Everything else — every portal route, every unregistered
// path, every typo — is treated as private.
//
// Shared chats are the one dynamic exception. They must bypass the login
// redirect (a visitor following a shared link has no account) and must not be
// blanket-tagged `noindex` at the middleware layer, because an INDEXED share is
// supposed to be indexable. The page's own metadata then applies the correct
// per-share directive — `noindex` for unlisted, revoked, and unavailable.
export function isPublicPath(pathname: string): boolean {
  return (
    STATIC_PUBLIC_PATHS.includes(pathname) ||
    isKnownPublicPath(pathname) ||
    isSharedChatPath(pathname)
  );
}
