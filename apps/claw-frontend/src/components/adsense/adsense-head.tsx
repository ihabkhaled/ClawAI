import { headers } from 'next/headers';

import { AdSenseScriptLoader } from '@/components/adsense/adsense-script-loader';
import { getAdSenseConfig } from '@/lib/adsense/adsense-config';

// Mounted once, in the (marketing) layout only — see that layout's comment
// for why. Two concerns live here and they are gated differently:
//
// 1. The verification `<meta>` tag: inert, never executes, safe wherever this
//    renders. It appears whenever a client id is configured and either the
//    review or the serving flag is on.
// 2. The loader `<script>`: delegated entirely to `AdSenseScriptLoader`, which
//    additionally requires the CURRENT PATHNAME to be AdSense-eligible
//    (`shouldLoadAdSenseScript` in adsense-eligibility.ts). That pathname
//    check is what keeps the loader off /share/chat, /terms, /privacy and
//    every other non-eligible page inside this route group.
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
      <AdSenseScriptLoader nonce={nonce} />
    </>
  );
}
