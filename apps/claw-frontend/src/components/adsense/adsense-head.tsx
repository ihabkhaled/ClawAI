import { headers } from 'next/headers';

import { ADSENSE_LOADER_SRC } from '@/constants/adsense.constants';
import { getAdSenseConfig } from '@/lib/adsense/adsense-config';

// Global AdSense verification metadata and loader. Keeping both in the root
// document head guarantees one executable loader across every route and avoids
// Next metadata merging replacing the account meta on localized pages.
export async function AdSenseHead(): Promise<React.ReactElement | null> {
  const config = getAdSenseConfig();
  if (!config.isConfigured || config.clientId === null) {
    return null;
  }
  if (!config.reviewMode && !config.servingEnabled) {
    return null;
  }

  const nonce = (await headers()).get('x-nonce') ?? undefined;

  return (
    <>
      <meta name="google-adsense-account" content={config.clientId} />
      <script
        async
        nonce={nonce}
        crossOrigin="anonymous"
        src={`${ADSENSE_LOADER_SRC}?client=${config.clientId}`}
      />
    </>
  );
}
