/**
 * How a model is paid for, as billing decides it (ADR-082): CREDIT debits the
 * user's credit wallet, INCLUDED is covered by the plan and never metered.
 */
export enum ModelBillingMode {
  CREDIT = 'CREDIT',
  INCLUDED = 'INCLUDED',
}

/** The billing chips on the admin model lists. */
export enum ModelBillingFilter {
  ALL = 'ALL',
  CREDIT = 'CREDIT',
  INCLUDED = 'INCLUDED',
}

/** Where a model's billing answer came from, so the badge can say why. */
export enum ModelBillingSource {
  // A connector for the provider exists: its "Credit connector" switch decides.
  CONNECTOR = 'CONNECTOR',
  // No connector row: auth-service falls back to PAYG_DEFAULT_PROVIDERS.
  PROVIDER_DEFAULT = 'PROVIDER_DEFAULT',
  // A local provider (PAYG_EXEMPT_PROVIDERS) is never metered.
  LOCAL_EXEMPT = 'LOCAL_EXEMPT',
}
