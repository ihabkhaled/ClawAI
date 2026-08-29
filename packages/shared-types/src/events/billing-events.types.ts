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

export type BillingSubscriptionDowngradedPayload = BillingSubscriptionEventBase & {
  previousPlanId: string;
  previousPlanSlug: string;
  previousPlanPriceVersionId: string;
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

/**
 * Money in: a PAYG credit top-up completed at a gateway.
 *
 * Deliberately NOT a `BillingSubscriptionEventBase`. A top-up buys a wallet
 * balance, not an entitlement — it has no plan, no subscription and no
 * `entitlementValidUntil`, and modelling it as one would invite a consumer to
 * extend paid access from a purchase that never granted any.
 *
 * `creditMicroUsd` is a decimal STRING, not a number. Credit is integer
 * micro-USD and a large package can exceed what JSON's double can carry
 * exactly; the consumer parses it back to a BigInt.
 */
export type BillingCreditTopupSucceededPayload = BillingEventEnvelope & {
  userId: string;
  creditMicroUsd: string;
  packageId: string;
  packageVersionId: string;
  paymentTransactionId: string;
  /** Integer minor units actually charged, in `currency`. */
  amountMinor: number;
  currency: string;
};

/**
 * Money back out: a refunded or charged-back top-up.
 *
 * The payment service enqueues the credit the returned money bought and does
 * NOT clamp it — it cannot see the wallet. Auth clamps to the UNSPENT
 * `PURCHASED` balance and records the shortfall, because spent credit is
 * consumed irreversibly and is not refundable (ADR-083, edge case E5).
 */
export type BillingCreditTopupReversedPayload = BillingEventEnvelope & {
  userId: string;
  creditMicroUsd: string;
  packageId: string;
  packageVersionId: string;
  /** The original CREDIT_TOPUP charge being reversed. */
  sourcePaymentTransactionId: string;
  /** The compensating REFUND/CHARGEBACK row that reversed it. */
  paymentTransactionId: string;
  amountMinor: number;
  currency: string;
  isChargeback: boolean;
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
  | BillingSubscriptionDowngradedPayload
  | BillingSubscriptionCancelledPayload
  | BillingSubscriptionExpiredPayload
  | BillingSubscriptionPastDuePayload
  | BillingSubscriptionSuspendedPayload
  | BillingPaymentRefundedPayload
  | BillingPaymentChargebackPayload
  | BillingCreditTopupSucceededPayload
  | BillingCreditTopupReversedPayload
  | BillingEntitlementReconcileRequestedPayload;
