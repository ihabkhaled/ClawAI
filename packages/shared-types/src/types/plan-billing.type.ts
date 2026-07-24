import type { BillingInterval } from '../enums/billing-interval.enum';
import type { ModelCostClass } from '../enums/model-cost-class.enum';
import type { PlanFeature } from '../enums/plan-feature.enum';
import type { PlanFeatureAccessMode } from '../enums/plan-feature-access-mode.enum';
import type { PlanFeatureWindow } from '../enums/plan-feature-window.enum';
import type { PlanModelAccessMode } from '../enums/plan-model-access-mode.enum';

// One immutable price row. A checkout and the subscription it creates retain the
// exact version they purchased, so changing a plan's price never rewrites
// historical subscriptions or invoices.
export type PlanPriceVersionSnapshot = {
  id: string;
  planId: string;
  billingInterval: BillingInterval;
  currency: string;
  amountMinor: number;
  version: number;
  isActive: boolean;
  effectiveFrom: string;
  retiredAt: string | null;
};

// A feature allowance. `limit` is null for DISABLED/ENABLED and a positive
// integer for LIMITED; `window` is null unless the mode is LIMITED.
export type PlanFeatureRuleSnapshot = {
  feature: PlanFeature;
  accessMode: PlanFeatureAccessMode;
  limit: number | null;
  window: PlanFeatureWindow | null;
};

// Quota allowances in cost-normalized weighted tokens.
// null means UNLIMITED. 0 means DISABLED. They are never interchangeable.
export type PlanQuotaSnapshot = {
  dailyWeightedTokens: number | null;
  weeklyWeightedTokens: number | null;
  monthlyWeightedTokens: number | null;
  maxChatsPerDay: number | null;
  maxMessagesPerDay: number | null;
  maxWorkspaceConnections: number | null;
  maxContextPacks: number | null;
  maxMemoryItems: number | null;
  maxConcurrentRequests: number | null;
};

// The authoritative billing view of a plan, served to payment-service over the
// internal API. `monthlyProviderCostCeilingMicroUsd` is an operational control
// and MUST NOT be projected into any non-admin response.
export type PlanBillingSnapshot = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  displayOrder: number;
  isActive: boolean;
  isPublic: boolean;
  isDefault: boolean;
  prices: PlanPriceVersionSnapshot[];
  featureRules: PlanFeatureRuleSnapshot[];
  quota: PlanQuotaSnapshot;
  modelAccessMode: PlanModelAccessMode;
  allowedCostClasses: ModelCostClass[];
  monthlyProviderCostCeilingMicroUsd: number | null;
};
