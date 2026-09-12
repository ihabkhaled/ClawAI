import {
  type PlanCatalogEntry,
  type PlanFeatureRuleView,
  type PlanPriceVersionView,
} from '../types/plan-catalog.types';
import { type Plan, type PlanFeatureRule, type PlanPriceVersion } from '../../../generated/prisma';

export function toPriceVersionView(price: PlanPriceVersion): PlanPriceVersionView {
  return {
    id: price.id,
    planId: price.planId,
    billingInterval: price.billingInterval,
    currency: price.currency,
    amountMinor: price.amountMinor,
    version: price.version,
    isActive: price.isActive,
    effectiveFrom: price.effectiveFrom,
    retiredAt: price.retiredAt,
    createdAt: price.createdAt,
  };
}

export function toFeatureRuleView(rule: PlanFeatureRule): PlanFeatureRuleView {
  return {
    feature: rule.feature,
    accessMode: rule.accessMode,
    limit: rule.limit,
    window: rule.window,
  };
}

/**
 * Projects a Plan row onto the billing view.
 *
 * Written as an explicit field list rather than a spread on purpose. A spread
 * would silently publish every column added to the Plan model in future — and
 * the very next such column, `monthlyProviderCostCeilingMicroUsd`, is a margin
 * control that must never leave the auth service.
 *
 * `paygCreditPercentBps` IS published, deliberately. It is a ratio the customer
 * is promised, not a cost we absorb: the pricing page has to be able to say
 * "30% of what you pay becomes connector credit", and it cannot without it.
 */
export function toCatalogEntry(
  plan: Plan,
  prices: PlanPriceVersionView[],
  features: PlanFeatureRuleView[],
): PlanCatalogEntry {
  return {
    id: plan.id,
    slug: plan.slug,
    name: plan.name,
    description: plan.description,
    displayOrder: plan.displayOrder,
    isDefault: plan.isDefault,
    isPopular: plan.isPopular,
    isPublic: plan.isPublic,
    isActive: plan.isActive,
    currency: plan.currency,
    isTrial: plan.isTrial,
    trialDurationDays: plan.trialDurationDays,
    paygCreditPercentBps: plan.paygCreditPercentBps,
    dailyTokenQuota: plan.dailyTokenQuota,
    weeklyTokenQuota: plan.weeklyTokenQuota,
    monthlyTokenQuota: plan.monthlyTokenQuota,
    maxChatsPerDay: plan.maxChatsPerDay,
    maxMessagesPerDay: plan.maxMessagesPerDay,
    maxWorkspaceConnections: plan.maxWorkspaceConnections,
    maxContextPacks: plan.maxContextPacks,
    maxMemoryItems: plan.maxMemoryItems,
    featureGates: {
      allowCompareMode: plan.allowCompareMode,
      allowJudgeMode: plan.allowJudgeMode,
      allowResearchMode: plan.allowResearchMode,
      allowCriticReview: plan.allowCriticReview,
      allowWorkspaces: plan.allowWorkspaces,
      allowMemory: plan.allowMemory,
      allowContextPacks: plan.allowContextPacks,
      allowConsensusMode: plan.allowConsensusMode,
      allowEscalationChain: plan.allowEscalationChain,
      allowRepairLab: plan.allowRepairLab,
      allowTaskDecomposer: plan.allowTaskDecomposer,
      allowBestOfN: plan.allowBestOfN,
      allowVerifier: plan.allowVerifier,
      allowPipelineLab: plan.allowPipelineLab,
      allowCostEnsemble: plan.allowCostEnsemble,
      allowRolePack: plan.allowRolePack,
    },
    prices,
    features,
  };
}
