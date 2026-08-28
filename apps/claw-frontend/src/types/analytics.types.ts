/** Resolved analytics configuration; null means "not configured, render nothing". */
export type AnalyticsConfig = {
  /** GTM container id, or null when unset or malformed. */
  gtmContainerId: string | null;
  /** GA4 measurement id for a direct gtag.js install, or null. */
  gaMeasurementId: string | null;
};
