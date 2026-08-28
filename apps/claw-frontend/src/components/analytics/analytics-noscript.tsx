import { GTM_NOSCRIPT_SRC } from '@/constants/analytics.constants';
import { getAnalyticsConfig } from '@/lib/analytics/analytics-config';

/**
 * The GTM fallback for a browser with JavaScript disabled.
 *
 * Google requires it immediately after the opening `<body>` tag, which is why
 * it is a separate component from the head loader rather than one that renders
 * both. It is an iframe, so it needs `frame-src` in the policy — `strict-dynamic`
 * covers scripts only and would not have helped here.
 *
 * There is no GA4 equivalent: gtag.js has no no-script path, so a direct GA4
 * install simply does not measure those visitors.
 */
export function AnalyticsNoscript(): React.ReactElement | null {
  const { gtmContainerId } = getAnalyticsConfig();
  if (gtmContainerId === null) {
    return null;
  }

  return (
    <noscript>
      <iframe
        src={`${GTM_NOSCRIPT_SRC}?id=${gtmContainerId}`}
        height="0"
        width="0"
        style={{ display: 'none', visibility: 'hidden' }}
        title="Google Tag Manager"
      />
    </noscript>
  );
}
