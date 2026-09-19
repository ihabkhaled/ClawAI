/** How an entitlements lookup treats an expired free trial. */
export interface EntitlementsLookupOptions {
  /**
   * Default true: an expired trial throws PLAN_TRIAL_EXPIRED (AI-use gates).
   * False: return the fallback plan's entitlements (permission and feature checks).
   */
  enforceTrial?: boolean;
}
