import type { SubscriptionStatus } from '@claw/shared-types';

// Everything needed to open a subscription. `uniqueActiveKey` is deliberately
// absent: it is derived from the status by the repository, never supplied.
export type CreateSubscriptionData = {
  userId: string;
  billingCustomerId: string;
  planId: string;
  planSlug: string;
  planPriceVersionId: string;
  gateway: string;
  status: string;
  billingInterval: string;
  currency: string;
  amountMinor: number;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  entitlementValidUntil: Date;
  encryptedGatewaySubscriptionId?: string | null;
  encryptionKeyVersion?: number;
  gatewaySubscriptionLookupHash?: string | null;
};

// Fields a status change may also set. Status, uniqueActiveKey and version are
// handled by the repository and are not settable here.
export type SubscriptionMutableFields = {
  currentPeriodStart?: Date;
  currentPeriodEnd?: Date;
  entitlementValidUntil?: Date;
  cancelAtPeriodEnd?: boolean;
  cancelledAt?: Date | null;
  pastDueAt?: Date | null;
  gracePeriodEndsAt?: Date | null;
  planId?: string;
  planSlug?: string;
  planPriceVersionId?: string;
  amountMinor?: number;
  currency?: string;
  billingInterval?: string;
  scheduledPlanId?: string | null;
  scheduledPlanSlug?: string | null;
  scheduledPlanPriceVersionId?: string | null;
  scheduledAmountMinor?: number | null;
  scheduledBillingInterval?: string | null;
  scheduledEffectiveAt?: Date | null;
  encryptedGatewaySubscriptionId?: string | null;
  gatewaySubscriptionLookupHash?: string | null;
};

// An optimistic-concurrency status change. `expectedVersion` is what the caller
// read; if the row has moved on, the update matches nothing and the caller is
// told there was a conflict rather than silently overwriting.
export type SubscriptionStatusChange = {
  id: string;
  userId: string;
  status: SubscriptionStatus;
  expectedVersion: number;
  data: SubscriptionMutableFields;
};

/**
 * A payment method being vaulted.
 *
 * There is deliberately no field a PAN could occupy: `last4` is the maximum card
 * fragment the type can carry, and the gateway token arrives separately so it is
 * never adjacent to the masked metadata in a log line.
 */
export type CreatePaymentMethodData = {
  /** Minted by the caller so the token can be encrypted against it before insert. */
  id: string;
  /** Ciphertext already bound to (userId, gateway, id). */
  encryptedToken: string;
  userId: string;
  billingCustomerId: string;
  gateway: string;
  /** Deterministic keyed index, for duplicate detection without plaintext. */
  tokenBlindIndex: string;
  encryptionKeyVersion: number;
  type: string;
  brand: string | null;
  last4: string | null;
  expiryMonth: number | null;
  expiryYear: number | null;
  isDefault: boolean;
  /** Absent consent, a method must not be vaulted at all. */
  consentedAt: Date | null;
};
