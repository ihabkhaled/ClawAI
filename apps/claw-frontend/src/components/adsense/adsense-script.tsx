import { headers } from 'next/headers';

import { ADSENSE_LOADER_SRC } from '@/constants/adsense.constants';
import { getAdSenseConfig } from '@/lib/adsense/adsense-config';

// Injects the AdSense loader.
//
// Deliberately a SERVER component rendering a plain <script>, rather than
// next/script with strategy="afterInteractive". Google's verification crawler
// looks for the snippet inside <head> of the SERVED HTML; afterInteractive only
// emits a <link rel="preload"> server-side and injects the real tag after
// hydration, so the crawler found a preload and no script. React 19 hoists an
// async <script src> into <head> automatically, producing exactly the tag
// Google asks for, server-rendered.
//
// The nonce is not optional here. Production CSP is
// `script-src 'self' 'nonce-…' 'strict-dynamic'`, and 'strict-dynamic' makes
// browsers IGNORE 'self' and every host allowlist — only a script carrying the
// nonce runs, and the ad scripts it then inserts inherit that trust. Rendering
// this tag without the nonce would silently block all ads in production.
//
// Rendered ONLY from the marketing layout, so it can never appear in the portal
// or auth route trees. Being inside that layout already establishes the route is
// public; per-path eligibility still governs individual ad UNITS via useAdUnit,
// which is where an ineligible page must be stopped.
export async function AdSenseScript(): Promise<React.ReactElement | null> {
  const config = getAdSenseConfig();

  // No valid publisher id and nothing renders. Review mode loads the script for
  // site verification; otherwise serving must be explicitly enabled.
  if (!config.isConfigured || config.clientId === null) {
    return null;
  }
  if (!config.reviewMode && !config.servingEnabled) {
    return null;
  }

  const nonce = (await headers()).get('x-nonce') ?? undefined;

  return (
    <script
      async
      nonce={nonce}
      crossOrigin="anonymous"
      src={`${ADSENSE_LOADER_SRC}?client=${config.clientId}`}
    />
  );
}
