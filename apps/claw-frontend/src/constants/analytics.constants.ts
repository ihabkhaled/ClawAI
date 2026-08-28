/**
 * Google Tag Manager and GA4 endpoints.
 *
 * Hosts are named here rather than inlined so the Content-Security-Policy can
 * import the same values it must allow — a tag whose host is not in the policy
 * is blocked silently, which looks exactly like analytics "not working".
 */
export const GTM_HOST = 'https://www.googletagmanager.com';
export const GTM_SCRIPT_SRC = `${GTM_HOST}/gtm.js`;
export const GTM_NOSCRIPT_SRC = `${GTM_HOST}/ns.html`;
export const GA_SCRIPT_SRC = `${GTM_HOST}/gtag/js`;

/** Where GA4 and GTM send their measurement payloads. */
export const ANALYTICS_CONNECT_HOSTS: ReadonlyArray<string> = [
  GTM_HOST,
  'https://www.google-analytics.com',
  'https://analytics.google.com',
  'https://region1.google-analytics.com',
];

/** Measurement pixels are still images as far as the policy is concerned. */
export const ANALYTICS_IMG_HOSTS: ReadonlyArray<string> = [
  GTM_HOST,
  'https://www.google-analytics.com',
];

/** The `<noscript>` fallback is an iframe, so it needs frame-src. */
export const ANALYTICS_FRAME_HOSTS: ReadonlyArray<string> = [GTM_HOST];
