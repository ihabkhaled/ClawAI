import type { BillingGateway } from '../enums/billing-gateway.enum';
import type { BillingInterval } from '../enums/billing-interval.enum';
import type { EntitlementGrantType } from '../enums/entitlement-grant-type.enum';
import type { SubscriptionStatus } from '../enums/subscription-status.enum';

// Every billing event carries this envelope. Consumers reject an event whose
// schemaVersion they do not know rather than guessing at its shape, and use
// eventId for inbox de-duplication.
export type BillingEventEnvelope = {
  eventId: string;
  schemaVersion: number;
  // Service that produced the event; auth rejects paid activations that did not
  // come from the payment service.
  producer: string;
  // The event that caused this one (null for a user-initiated root action).
  causationId: string | null;
  // Stable across the whole causal chain, for tracing.
  correlationId: string;
  occurredAt: string;
};

// Common to every subscription-scoped billing event.
export type BillingSubscriptionEventBase = BillingEventEnvelope & {
  userId: string;
  subscriptionId: string;
  planId: string;
  planSlug: string;
  planPriceVersionId: string;
  grantType: EntitlementGrantType;
  effectiveAt: string;
  // Auth extends the user's entitlement to exactly this instant. A stale event
  // whose value is older than the stored one is dropped as SUPERSEDED.
  entitlementValidUntil: string;
};

export type BillingSubscriptionActivatedPayload = BillingSubscriptionEventBase & {
  gateway: BillingGateway;
  billingInterval: BillingInterval;
  currency: string;
  amountMinor: number;
};

export type BillingSubscriptionRenewedPayload = BillingSubscriptionEventBase & {
  gateway: BillingGateway;
  currentPeriodStart: string;
  currentPeriodEnd: string;
};

export type BillingSubscriptionUpgradedPayload = BillingSubscriptionEventBase & {
  previousPlanId: string;
  previousPlanSlug: string;
  previousPlanPriceVersionId: string;
  prorationAmountMinor: number;
  currency: string;
};

export type BillingSubscriptionDowngradeScheduledPayload = BillingSubscriptionEventBase & {
  targetPlanId: string;
  targetPlanSlug: string;
  targetPlanPriceVersionId: string;
  scheduledEffectiveAt: string;
};

export type BillingSubscriptionCancelledPayload = BillingSubscriptionEventBase & {
  cancelAtPeriodEnd: boolean;
  cancelledAt: string;
};

export type BillingSubscriptionExpiredPayload = BillingSubscriptionEventBase & {
  // Plan the user falls back to (always the default free plan today).
  fallbackPlanSlug: string;
};

export type BillingSubscriptionPastDuePayload = BillingSubscriptionEventBase & {
  pastDueAt: string;
  gracePeriodEndsAt: string;
};

export type BillingSubscriptionSuspendedPayload = BillingSubscriptionEventBase & {
  previousStatus: SubscriptionStatus;
  reasonCode: string;
};

export type BillingPaymentRefundedPayload = BillingSubscriptionEventBase & {
  paymentTransactionId: string;
  refundedAmountMinor: number;
  currency: string;
  isFullRefund: boolean;
};

export type BillingPaymentChargebackPayload = BillingSubscriptionEventBase & {
  paymentTransactionId: string;
  disputedAmountMinor: number;
  currency: string;
};

// Asks auth to re-derive a user's entitlement from the payment service's truth.
// Emitted by the reconciliation job when the two sides disagree.
export type BillingEntitlementReconcileRequestedPayload = BillingEventEnvelope & {
  userId: string;
  subscriptionId: string | null;
  reasonCode: string;
};

export type BillingEventPayload =
  | BillingSubscriptionActivatedPayload
  | BillingSubscriptionRenewedPayload
  | BillingSubscriptionUpgradedPayload
  | BillingSubscriptionDowngradeScheduledPayload
  | BillingSubscriptionCancelledPayload
  | BillingSubscriptionExpiredPayload
  | BillingSubscriptionPastDuePayload
  | BillingSubscriptionSuspendedPayload
  | BillingPaymentRefundedPayload
  | BillingPaymentChargebackPayload
  | BillingEntitlementReconcileRequestedPayload;
