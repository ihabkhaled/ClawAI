import { headers } from 'next/headers';
import Script from 'next/script';

import { GA_SCRIPT_SRC } from '@/constants/analytics.constants';
import { getAnalyticsConfig } from '@/lib/analytics/analytics-config';
import { buildGaBootstrapScript, buildGtmBootstrapScript } from '@/utilities/analytics.utility';

/**
 * Google Tag Manager and GA4 loaders, as high in the document as it goes.
 *
 * Position is the point. GTM measures from the moment its snippet runs, so a
 * loader placed after the app's own scripts under-reports everything that
 * happens before hydration — which is why this renders from the root layout's
 * `<head>` and not from a page.
 *
 * `next/script` rather than a raw tag with `dangerouslySetInnerHTML`: the
 * bootstrap has to be inline (it stamps `gtm.start` at the instant it executes,
 * and every later measurement is relative to that timestamp), and this is the
 * framework's sanctioned way to inline one without reaching for the dangerous
 * prop in application code.
 *
 * Both tags carry the per-request nonce. Production CSP is `strict-dynamic`,
 * under which a nonce-trusted script passes its trust to everything it inserts
 * — the only reason the container can go on to load tags whose hosts appear
 * nowhere in the policy.
 *
 * Renders nothing when the ids are unset or malformed, so an install that has
 * not configured analytics ships no tag rather than one that 404s on every page.
 */
export async function AnalyticsHead(): Promise<React.ReactElement | null> {
  const { gtmContainerId, gaMeasurementId } = getAnalyticsConfig();
  if (gtmContainerId === null && gaMeasurementId === null) {
    return null;
  }

  const nonce = (await headers()).get('x-nonce') ?? undefined;

  return (
    <>
      {gtmContainerId === null ? null : (
        <Script id="gtm-bootstrap" strategy="beforeInteractive" nonce={nonce}>
          {buildGtmBootstrapScript(gtmContainerId)}
        </Script>
      )}
      {gaMeasurementId === null ? null : (
        <>
          <Script
            id="ga-loader"
            strategy="afterInteractive"
            nonce={nonce}
            src={`${GA_SCRIPT_SRC}?id=${gaMeasurementId}`}
          />
          <Script id="ga-bootstrap" strategy="afterInteractive" nonce={nonce}>
            {buildGaBootstrapScript(gaMeasurementId)}
          </Script>
        </>
      )}
    </>
  );
}
