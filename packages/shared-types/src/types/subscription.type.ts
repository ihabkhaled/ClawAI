import type { BillingGateway } from '../enums/billing-gateway.enum';
import type { BillingInterval } from '../enums/billing-interval.enum';
import type { SubscriptionStatus } from '../enums/subscription-status.enum';

// The client-safe projection of a subscription. Deliberately omits every
// gateway identifier — those are encrypted at rest and never leave the
// payment service.
export type SubscriptionSummary = {
  id: string;
  planId: string;
  planSlug: string;
  planName: string;
  planPriceVersionId: string;
  gateway: BillingGateway;
  status: SubscriptionStatus;
  billingInterval: BillingInterval;
  currency: string;
  amountMinor: number;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  cancelledAt: string | null;
  pastDueAt: string | null;
  gracePeriodEndsAt: string | null;
  entitlementValidUntil: string;
  // Populated when a downgrade is queued for the end of the current period.
  scheduledPlanId: string | null;
  scheduledPlanSlug: string | null;
  scheduledEffectiveAt: string | null;
};

// What the billing page needs in one call: the subscription (or null for a Free
// user) plus the plan the user is actually entitled to right now.
export type BillingOverview = {
  subscription: SubscriptionSummary | null;
  currentPlanSlug: string;
  currentPlanName: string;
  isPaid: boolean;
  // True while PAST_DUE and still inside the grace window.
  inGracePeriod: boolean;
  gracePeriodEndsAt: string | null;
};
