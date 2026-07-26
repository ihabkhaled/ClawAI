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

// Single implementation of "unknown routes default to non-indexable":
// a path is public only if it is an explicitly PUBLISHED + INDEXABLE
// content-registry entry, or one of the framework crawler files above.
// Everything else — every portal route, every unregistered path, every
// typo — is treated as private.
export function isPublicPath(pathname: string): boolean {
  return STATIC_PUBLIC_PATHS.includes(pathname) || isKnownPublicPath(pathname);
}
