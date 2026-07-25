// Everything needed to open a paid subscription from a VERIFIED payment.
//
// `paymentVerified` is explicit rather than implied by reaching this type: the
// activation path refuses to run without it, so a future caller cannot activate
// a paid plan simply by forgetting to check.
export type ActivateSubscriptionInput = {
  userId: string;
  billingCustomerId: string;
  checkoutSessionId: string;
  planId: string;
  planSlug: string;
  planPriceVersionId: string;
  gateway: string;
  billingInterval: string;
  baseCurrency: string;
  baseAmountMinor: number;
  periodStartMs: number;
  periodEndMs: number;
  entitlementValidUntilMs: number;
  encryptedGatewaySubscriptionId: string | null;
  gatewaySubscriptionLookupHash: string | null;
  correlationId: string;
  paymentVerified: boolean;
};
