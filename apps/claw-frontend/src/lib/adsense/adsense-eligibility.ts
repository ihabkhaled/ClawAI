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
