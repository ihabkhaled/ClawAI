'use client';

import { ADSENSE_LOADER_SRC } from '@/constants/adsense.constants';
import { useAdSenseScript } from '@/hooks/adsense/use-adsense-script';
import type { AdSenseScriptLoaderProps } from '@/types/adsense.types';

// The ONLY place the AdSense loader script is emitted. `useAdSenseScript`
// resolves the current pathname and delegates to `shouldLoadAdSenseScript`
// (the single authoritative gate in adsense-eligibility.ts), so this renders
// nothing on /share/chat, /terms, /privacy or any other non-eligible page
// inside the (marketing) tree — not just outside it.
//
// A client component so `usePathname()` sees route changes; a `<script>`
// rendered anywhere in the tree (not only literally inside <head>) is hoisted
// there by React, so this does not need to live in the document head itself.
export function AdSenseScriptLoader({
  nonce,
}: AdSenseScriptLoaderProps): React.ReactElement | null {
  const { shouldLoad, clientId } = useAdSenseScript();

  if (!shouldLoad || clientId === null) {
    return null;
  }

  return (
    <script
      async
      nonce={nonce}
      crossOrigin="anonymous"
      src={`${ADSENSE_LOADER_SRC}?client=${clientId}`}
    />
  );
}
