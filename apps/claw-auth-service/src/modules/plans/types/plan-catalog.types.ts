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
  effectiveFrom: Date;
  retiredAt: Date | null;
  createdAt: Date;
};

export type PlanFeatureRuleView = {
  feature: PlanFeatureKey;
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
  /** The plan a new signup is granted. */
  isDefault: boolean;
  /** The plan the public pricing page badges "Most popular". */
  isPopular: boolean;
  /** False hides the plan from the public pricing page entirely. */
  isPublic: boolean;
  /** False means the plan is no longer sold; existing subscribers keep it. */
  isActive: boolean;
  /** ISO 4217. Null only on legacy rows that predate the column. */
  currency: string | null;
  isTrial: boolean;
  trialDurationDays: number | null;
  /**
   * Share of the monthly price that becomes pay-as-you-go connector credit, in
   * basis points (3000 = 30%).
   *
   * Safe to publish, and it has to be: it is a headline term of the offer —
   * "pay $20, get $5 of connector credit" — and the pricing page cannot state
   * it without this number. It is a RATIO, not a cost: unlike
   * `monthlyProviderCostCeilingMicroUsd` (deliberately absent above) it reveals
   * nothing about our margin, because the dollar figure it produces is one the
   * customer is being promised anyway.
   */
  paygCreditPercentBps: number;
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
