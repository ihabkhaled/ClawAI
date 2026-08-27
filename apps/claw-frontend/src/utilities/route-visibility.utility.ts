import { SHARE_CHAT_PATH_PREFIX } from '@/constants/chat-share.constants';
import { RouteVisibility } from '@/enums/route-visibility.enum';
import { DEFAULT_LOCALE } from '@/lib/i18n/i18n.constants';
import { isKnownPublicPathForLocale } from '@/utilities/content-registry.utility';
import { parseLocaleFromPathname, stripLocaleFromPathname } from '@/utilities/locale.utility';

// Framework-generated crawler files that are never registry entries but
// must never be tagged noindex either.
const STATIC_PUBLIC_PATHS: ReadonlyArray<string> = [
  '/robots.txt',
  '/sitemap.xml',
  '/sitemaps',
  '/manifest.webmanifest',
  '/icon.png',
  '/apple-icon.png',
  '/icon-maskable.png',
  '/opengraph-image',
  '/favicon.ico',
  '/ads.txt',
  '/llms.txt',
];

function matchesStaticPublicPath(pathname: string): boolean {
  return STATIC_PUBLIC_PATHS.some(
    (path) => pathname === path || (path === '/sitemaps' && pathname.startsWith('/sitemaps/')),
  );
}

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
  const unlocalizedPath = stripLocaleFromPathname(pathname);
  return unlocalizedPath.startsWith(`${SHARE_CHAT_PATH_PREFIX}/`);
}

export function classifyRouteVisibility(pathname: string): RouteVisibility {
  if (matchesStaticPublicPath(pathname)) {
    return RouteVisibility.PUBLIC_MACHINE_ROUTE;
  }
  const locale = parseLocaleFromPathname(pathname);
  const unlocalizedPath = stripLocaleFromPathname(pathname);
  if (pathname === '/' && isKnownPublicPathForLocale(pathname, DEFAULT_LOCALE)) {
    return RouteVisibility.STATIC_PUBLIC;
  }
  if (isSharedChatPath(pathname)) {
    return locale === null ? RouteVisibility.UNKNOWN : RouteVisibility.DYNAMIC_PUBLIC_CANDIDATE;
  }
  if (locale !== null && isKnownPublicPathForLocale(unlocalizedPath, locale)) {
    return RouteVisibility.STATIC_PUBLIC;
  }
  return RouteVisibility.PRIVATE;
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
  const visibility = classifyRouteVisibility(pathname);
  return (
    visibility === RouteVisibility.PUBLIC_MACHINE_ROUTE ||
    visibility === RouteVisibility.STATIC_PUBLIC ||
    visibility === RouteVisibility.DYNAMIC_PUBLIC_CANDIDATE
  );
}
