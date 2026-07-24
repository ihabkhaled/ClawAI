'use client';

import Script from 'next/script';

import { useAdSenseScript } from '@/hooks/adsense/use-adsense-script';

// Injects the AdSense loader script. Rendered ONLY inside the marketing
// layout, so it can never appear in the portal or auth route trees. It
// self-gates via useAdSenseScript: no configured client id, or an
// ineligible/non-review path with serving off, and it renders nothing.
export function AdSenseScript(): React.ReactElement | null {
  const { shouldLoad, clientId } = useAdSenseScript();

  if (!shouldLoad || clientId === null) {
    return null;
  }

  return (
    <Script
      id="adsense-loader"
      strategy="afterInteractive"
      crossOrigin="anonymous"
      src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${clientId}`}
    />
  );
}
