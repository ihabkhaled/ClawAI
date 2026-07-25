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
