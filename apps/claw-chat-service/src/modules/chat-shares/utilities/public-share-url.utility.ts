import { PUBLIC_SHARE_PATH_PREFIX } from '../constants/public-share-route.constants';

/**
 * Builds the canonical public URL for a share.
 *
 * The origin comes from configuration and nothing else. Deriving it from a
 * request Host or X-Forwarded-Host header is the classic host-header injection:
 * an attacker who can set that header would have us mint — and hand to a search
 * engine — a canonical URL pointing at a domain they control.
 */
export function buildPublicShareUrl(siteUrl: string, publicShareId: string): string {
  return `${siteUrl.replace(/\/+$/, '')}${PUBLIC_SHARE_PATH_PREFIX}/${publicShareId}`;
}
