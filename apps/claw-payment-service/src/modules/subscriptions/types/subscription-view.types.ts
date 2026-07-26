// What the browser is allowed to know about a subscription.
//
// Field names mirror the frontend types verbatim. Renaming one on the way out
// is how date rendering breaks silently: `new Date(undefined)` is "Invalid
// Date", and neither typecheck catches it because each side stays internally
// consistent.
export type CurrentSubscriptionView = {
  id: string;
  planId: string;
  planSlug: string;
  planName: string;
  status: string;
  billingInterval: string;
  currency: string;
  amountMinor: number;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  gracePeriodEndsAt: string | null;
  scheduledPlanSlug: string | null;
  scheduledEffectiveAt: string | null;
};

export type InvoiceView = {
  id: string;
  number: string;
  status: string;
  currency: string;
  totalMinor: number;
  issuedAt: string;
  paidAt: string | null;
  hostedInvoiceUrl: string | null;
};

// Masked metadata only. There is deliberately no field here that could hold a
// PAN, a CVV, or the vaulted token itself.
export type PaymentMethodView = {
  id: string;
  gateway: string;
  brand: string | null;
  last4: string | null;
  expiryMonth: number | null;
  expiryYear: number | null;
  isDefault: boolean;
};

// The amount a plan change will cost, shown before anything is charged.
export type ProrationQuoteResponse = {
  quoteId: string;
  targetPlanSlug: string;
  currency: string;
  unusedCurrentCreditMinor: number;
  targetRemainingChargeMinor: number;
  amountDueMinor: number;
  isScheduledForPeriodEnd: boolean;
  scheduledEffectiveAt: string | null;
  expiresAt: string;
};
