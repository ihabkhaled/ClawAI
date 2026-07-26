import { type BillingIntervalKind, type PlanFeatureKey } from '../../../generated/prisma';

/**
 * What the payment service is allowed to know about a price.
 *
 * `amountMinor` is an integer minor unit and `planPriceVersionId` identifies
 * the immutable row it came from. The payment service records that id on the
 * checkout session, so a charge can be re-derived years later even after the
 * price has been repriced several times.
 */
export type PlanPriceVersionView = {
  id: string;
  planId: string;
  billingInterval: BillingIntervalKind;
  currency: string;
  amountMinor: number;
  version: number;
  isActive: boolean;
};

export type PlanFeatureRuleView = {
  feature: PlanFeatureKey;
  accessMode: string;
  limit: number | null;
  window: string | null;
};

/**
 * A plan as the billing surface sees it.
 *
 * Deliberately omits the operational fields a customer must never see —
 * `monthlyProviderCostCeilingMicroUsd` above all, which is a margin control and
 * not a product limit.
 */
export type PlanCatalogEntry = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  displayOrder: number;
  isDefault: boolean;
  dailyTokenQuota: number | null;
  weeklyTokenQuota: number | null;
  monthlyTokenQuota: number | null;
  maxChatsPerDay: number | null;
  maxMessagesPerDay: number | null;
  maxWorkspaceConnections: number | null;
  maxContextPacks: number | null;
  maxMemoryItems: number | null;
  prices: PlanPriceVersionView[];
  features: PlanFeatureRuleView[];
};
