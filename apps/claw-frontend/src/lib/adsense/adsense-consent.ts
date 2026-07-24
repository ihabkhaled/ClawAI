// Consent integration point for a Google-certified Consent Management
// Platform (CMP). ClawAI does not ship an imitation CMP; this is the single
// seam a real CMP integration replaces. Until a CMP is wired, advertising
// consent is considered granted ONLY implicitly by the operator turning on
// NEXT_PUBLIC_ADSENSE_SERVING_ENABLED — which the operator must not do for
// EEA/UK/CH traffic without a certified CMP in place (documented in the
// AdSense compliance guide). Rejecting optional advertising consent must
// never break the app: this function only affects whether an ad REQUEST is
// made, never whether the page renders.
export function hasAdvertisingConsent(): boolean {
  // A real CMP would read the TCF v2 consent string (e.g. via
  // window.__tcfapi) here and return whether "store and/or access
  // information on a device" + "personalised ads" purposes are granted.
  return true;
}
