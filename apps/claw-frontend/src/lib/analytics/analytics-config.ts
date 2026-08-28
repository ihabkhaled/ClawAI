import type { AnalyticsConfig } from '@/types/analytics.types';

/**
 * A container id is `GTM-` followed by the short code from the GTM console.
 *
 * Validated rather than trusted, for the same reason the AdSense client id is:
 * a copy-paste accident — the whole snippet pasted into the variable, or a
 * `GTM-XXXXXXX` placeholder left in — must resolve to "not configured" and
 * render nothing, instead of emitting a tag that 404s on every page load.
 */
const GTM_CONTAINER_ID_PATTERN = /^GTM-[A-Z0-9]{4,12}$/u;

/** A GA4 measurement id is `G-` followed by the property's short code. */
const GA_MEASUREMENT_ID_PATTERN = /^G-[A-Z0-9]{4,12}$/u;

export function isValidGtmContainerId(value: string | null | undefined): boolean {
  return typeof value === 'string' && GTM_CONTAINER_ID_PATTERN.test(value);
}

export function isValidGaMeasurementId(value: string | null | undefined): boolean {
  return typeof value === 'string' && GA_MEASUREMENT_ID_PATTERN.test(value);
}

/**
 * Resolves analytics configuration from the environment.
 *
 * The two are independent. A GTM container usually carries the GA4 tag inside
 * it, in which case only the container id is set; a direct GA4 id is there for
 * installs that want gtag.js without a container. Setting both is valid but
 * will double-count if the container also fires GA4, so it is worth knowing
 * which one you have.
 */
export function getAnalyticsConfig(): AnalyticsConfig {
  const gtmContainerId = process.env['NEXT_PUBLIC_GTM_ID'];
  const gaMeasurementId = process.env['NEXT_PUBLIC_GA_MEASUREMENT_ID'];

  return {
    gtmContainerId: isValidGtmContainerId(gtmContainerId) ? (gtmContainerId ?? null) : null,
    gaMeasurementId: isValidGaMeasurementId(gaMeasurementId) ? (gaMeasurementId ?? null) : null,
  };
}
