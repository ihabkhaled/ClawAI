// Mirrors the auth-service internal contract. Deliberately a separate
// declaration rather than an import: payment-service does not depend on
// auth-service, and the Zod schema alongside this type is what turns the
// response into trusted state.

export type PlanPriceVersionView = {
  id: string;
  planId: string;
  billingInterval: string;
  currency: string;
  // Integer minor units. This is the ONLY authoritative price in the system.
  amountMinor: number;
  version: number;
  isActive: boolean;
};

export type PlanFeatureRuleView = {
  feature: string;
  accessMode: string;
  limit: number | null;
  window: string | null;
};

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
