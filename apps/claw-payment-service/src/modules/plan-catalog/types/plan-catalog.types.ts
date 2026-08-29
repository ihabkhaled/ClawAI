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

export type PlanFeatureGatesView = {
  allowCompareMode: boolean;
  allowJudgeMode: boolean;
  allowResearchMode: boolean;
  allowCriticReview: boolean;
  allowWorkspaces: boolean;
  allowMemory: boolean;
  allowContextPacks: boolean;
  allowConsensusMode: boolean;
  allowEscalationChain: boolean;
  allowRepairLab: boolean;
  allowTaskDecomposer: boolean;
  allowBestOfN: boolean;
  allowVerifier: boolean;
  allowPipelineLab: boolean;
  allowCostEnsemble: boolean;
  allowRolePack: boolean;
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
  featureGates: PlanFeatureGatesView;
  prices: PlanPriceVersionView[];
  features: PlanFeatureRuleView[];
};

/**
 * A credit package plus its ACTIVE price version, as auth returns it.
 *
 * Mirrors `CreditPackageView` in `@claw/shared-types` and is deliberately a
 * separate declaration for the same reason `PlanPriceVersionView` is: the Zod
 * schema alongside it, not the shared type, is what turns the response into
 * trusted state on the money path.
 */
export type CreditPackageVersionView = {
  id: string;
  slug: string;
  /** Integer minor units. The ONLY authoritative price for a top-up. */
  priceMinor: number;
  currency: string;
  /** Integer micro-USD of credit bought. Independent of `priceMinor`. */
  creditMicroUsd: number;
  displayOrder: number;
  /** The immutable version the price came from. Frozen onto the session. */
  versionId: string;
};
