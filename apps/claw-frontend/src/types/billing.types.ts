import type { BillingInterval, PlanFeature, SubscriptionStatus } from '@/enums/billing.enum';

// Field names mirror the backend DTOs verbatim. Renaming one on the way in is
// how date and money rendering breaks silently: new Date(undefined) is
// "Invalid Date", and typecheck cannot catch it because the FE type stays
// internally consistent.

export type BillingPlanPrice = {
  billingInterval: BillingInterval;
  currency: string;
  // Integer minor units. The browser never computes an authoritative amount —
  // it only formats this one.
  amountMinor: number;
  planPriceVersionId: string;
};

export type BillingPlan = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  displayOrder: number;
  isDefault: boolean;
  prices: BillingPlanPrice[];
  // null means unlimited; 0 means disabled. Never collapse them in the UI.
  dailyTokenQuota: number | null;
  weeklyTokenQuota: number | null;
  monthlyTokenQuota: number | null;
  maxChatsPerDay: number | null;
  maxMessagesPerDay: number | null;
  maxWorkspaceConnections: number | null;
  maxContextPacks: number | null;
  maxMemoryItems: number | null;
  features: BillingPlanFeature[];
};

export type BillingPlanFeature = {
  feature: PlanFeature;
  accessMode: string;
  limit: number | null;
  window: string | null;
};

export type CurrentSubscription = {
  id: string;
  planId: string;
  planSlug: string;
  planName: string;
  status: SubscriptionStatus;
  billingInterval: BillingInterval;
  currency: string;
  amountMinor: number;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  // Present only while PAST_DUE — drives the grace banner.
  gracePeriodEndsAt: string | null;
  // The plan a scheduled downgrade will move to at period end.
  scheduledPlanSlug: string | null;
  scheduledEffectiveAt: string | null;
};

export type UsageWindow = {
  used: number;
  // null means unlimited.
  limit: number | null;
  remaining: number | null;
  periodKey: string;
};

export type BillingUsage = {
  day: UsageWindow;
  week: UsageWindow;
  month: UsageWindow;
  // Provider-cost budgets are internal and are NEVER sent to a normal user;
  // the field exists only for the admin dashboard.
  features: FeatureAllowance[];
};

export type FeatureAllowance = {
  feature: PlanFeature;
  allowed: boolean;
  limit: number | null;
  used: number;
  remaining: number | null;
  window: string | null;
};

export type ProrationQuoteView = {
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

export type CheckoutSessionView = {
  id: string;
  status: string;
  gateway: string;
  // What the gateway will actually charge, already FX-converted server-side.
  chargeAmountMinor: number;
  chargeCurrency: string;
  hostedCheckoutUrl: string | null;
  expiresAt: string;
};

export type PaymentMethodSetupSessionView = {
  id: string;
  status: string;
  gateway: string;
  hostedCheckoutUrl: string | null;
  expiresAt: string;
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

export type PaymentMethodView = {
  id: string;
  gateway: string;
  brand: string | null;
  last4: string | null;
  expiryMonth: number | null;
  expiryYear: number | null;
  isDefault: boolean;
};
