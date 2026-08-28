import { GTM_SCRIPT_SRC } from '@/constants/analytics.constants';

/**
 * Google's own GTM bootstrap, with the container id interpolated.
 *
 * Kept verbatim rather than reimplemented: it stamps `gtm.start` at the instant
 * it executes, and that timestamp is what every downstream measurement is
 * relative to. A "tidier" rewrite that creates the tag later moves the origin
 * of the measurement window and quietly changes the numbers.
 *
 * The id reaching here is already validated against `GTM-[A-Z0-9]{4,12}`, so
 * there is no path from user input into this string.
 */
export function buildGtmBootstrapScript(containerId: string): string {
  return `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='${GTM_SCRIPT_SRC}?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${containerId}');`;
}

/**
 * The gtag bootstrap for a direct GA4 install.
 *
 * Must run before the async gtag.js arrives so the queue it drains already
 * exists; that is why `dataLayer` and the `js` event are pushed here rather
 * than waiting for the loader.
 */
export function buildGaBootstrapScript(measurementId: string): string {
  return `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${measurementId}');`;
}
