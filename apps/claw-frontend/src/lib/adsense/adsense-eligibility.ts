import { isAdEligiblePath } from '@/utilities/content-registry.utility';

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
  if (serverEligibility !== undefined) {
    return serverEligibility;
  }
  return isAdUnitEligible(pathname);
}

// Whether the AdSense verification/serving SCRIPT may be injected at all.
// The script only ever lives in the marketing layout (so it can never appear
// in the portal or auth trees), but it is additionally gated on configuration
// plus either an active review (verification) or an ad-eligible marketing
// page with serving enabled.
export function shouldLoadAdSenseScript(params: {
  isConfigured: boolean;
  reviewMode: boolean;
  servingEnabled: boolean;
  pathname: string;
}): boolean {
  if (!params.isConfigured) {
    return false;
  }
  if (params.reviewMode) {
    return true;
  }
  return params.servingEnabled && isAdUnitEligible(params.pathname);
}
