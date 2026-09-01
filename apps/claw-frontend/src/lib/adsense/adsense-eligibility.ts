import { CHAT_SHARE_REVIEW_LOCKDOWN_ENABLED } from '@/constants/chat-share-review-lockdown.constants';
import { SHARE_CHAT_PATH_PREFIX } from '@/constants/chat-share.constants';
import { isAdEligiblePath } from '@/utilities/content-registry.utility';

function isChatSharePath(pathname: string): boolean {
  return pathname.includes(SHARE_CHAT_PATH_PREFIX);
}

// Whether a MANUAL ad unit may render on a given path. This is the single
// authoritative gate: it delegates to the content registry, which only
// returns true for a PUBLISHED + reviewed + explicitly ad-ELIGIBLE editorial
// page. Every portal route, every auth route, every legal/contact/form page,
// and every unknown/unregistered path resolves to false by construction —
// there is no allowlist to forget to update, and the default is deny.
export function isAdUnitEligible(pathname: string): boolean {
  return isAdEligiblePath(pathname);
}

/**
 * Eligibility for a unit that may be on a dynamic page.
 *
 * Static editorial pages resolve through the content registry by path. Dynamic
 * pages cannot: `/share/chat/<22 random characters>` matches the route for every
 * conceivable identifier, including revoked ones, thin ones, and ones the safety
 * scan flagged. Deciding from the URL pattern there would make any string that
 * happens to match the route an ad surface.
 *
 * So when a caller supplies a server-derived verdict it REPLACES the path lookup.
 * `undefined` — meaning the caller could not determine eligibility — is treated
 * exactly like `false`. Fail closed: an ad we did not serve costs a fraction of a
 * cent, and an ad on a revoked or unsafe page costs the AdSense account.
 */
export function resolveAdUnitEligibility(
  pathname: string,
  serverEligibility: boolean | undefined,
): boolean {
  // Blanket override for the AdSense review window: a share the safety scan
  // marked eligible is still exposure during review, so this wins over any
  // server verdict — see CHAT_SHARE_REVIEW_LOCKDOWN_ENABLED's own comment.
  if (CHAT_SHARE_REVIEW_LOCKDOWN_ENABLED && isChatSharePath(pathname)) {
    return false;
  }
  if (serverEligibility !== undefined) {
    return serverEligibility;
  }
  return isAdUnitEligible(pathname);
}

// Whether the AdSense verification/serving SCRIPT may be injected at all.
// The script is mounted only in the (marketing) layout (so it structurally
// cannot appear in the portal, auth or payment trees), but that layout also
// contains non-eligible pages — /share/chat, /terms, /privacy and friends —
// so eligibility is ALSO enforced per-pathname here, the same registry-backed
// check that gates manual ad units. `reviewMode` no longer bypasses this: a
// page Google's reviewer should never see monetized on must not carry the
// loader either, verification or not.
export function shouldLoadAdSenseScript(params: {
  isConfigured: boolean;
  reviewMode: boolean;
  servingEnabled: boolean;
  pathname: string;
}): boolean {
  if (!params.isConfigured) {
    return false;
  }
  if (!isAdUnitEligible(params.pathname)) {
    return false;
  }
  if (CHAT_SHARE_REVIEW_LOCKDOWN_ENABLED && isChatSharePath(params.pathname)) {
    return false;
  }
  return params.reviewMode || params.servingEnabled;
}
