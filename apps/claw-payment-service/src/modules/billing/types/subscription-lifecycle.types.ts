import {
  type EventPattern,
  type PaymentTransactionType,
  type SubscriptionStatus,
} from '@claw/shared-types';

// Everything needed to open a paid subscription from a VERIFIED payment.
//
// `paymentVerified` is explicit rather than implied by reaching this type: the
// activation path refuses to run without it, so a future caller cannot activate
// a paid plan simply by forgetting to check.
export type ActivateSubscriptionInput = {
  userId: string;
  invoiceRecipientEmail: string | null;
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
  /**
   * The gateway's own id for the capture that paid for this subscription.
   *
   * Recorded on the payment transaction so a later refund or chargeback naming
   * that capture can be paired with the charge it reverses. Null only when a
   * gateway genuinely gives us nothing to key on.
   */
  providerTransactionId: string | null;
  /** The gateway order/intention this capture belongs to, when there is one. */
  providerOrderId: string | null;
  /** What the provider actually reported charging, in its own currency. */
  providerAmountMinor: number | null;
  providerCurrency: string | null;
};

/** Outcome of an activation: the subscription plus its financial record. */
export type ActivationResult = {
  subscriptionId: string;
  transactionId: string;
  invoiceNumber: string;
};

/**
 * A refund or chargeback that also ends the entitlement it paid for.
 *
 * `status` and `pattern` are supplied by the caller rather than derived from
 * `type`, because the policy differs: a chargeback suspends and is a dispute, a
 * full refund cancels and is a customer-service outcome. Deriving one from the
 * other would bury that decision in this type.
 */
export type ReverseSubscriptionInput = {
  subscriptionId: string;
  userId: string;
  gateway: string;
  type: PaymentTransactionType;
  /** Positive magnitude; stored negative on the compensating row. */
  amountMinor: number;
  currency: string;
  providerAmountMinor: number | null;
  providerCurrency: string | null;
  providerTransactionId: string | null;
  idempotencyKey: string;
  reversesTransactionId: string | null;
  invoiceId: string | null;
  status: SubscriptionStatus;
  pattern: EventPattern;
  correlationId: string;
};
