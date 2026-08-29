import { z } from 'zod';

// The price is validated as a NON-NEGATIVE INTEGER before it is allowed to
// become a charge.
//
// This is not defensive paranoia about our own service. A float here would
// silently produce a fractional charge; a negative would produce a refund
// disguised as a purchase. Whatever the cause — a schema drift, a bad
// migration, a compromised hop — the checkout must fail rather than charge a
// number it does not understand.
const priceVersionSchema = z.object({
  id: z.string().min(1).max(64),
  planId: z.string().min(1).max(64),
  billingInterval: z.string().min(1).max(32),
  currency: z.string().length(3),
  amountMinor: z.number().int().nonnegative(),
  version: z.number().int().positive(),
  isActive: z.boolean(),
});

const featureRuleSchema = z.object({
  feature: z.string().min(1).max(64),
  accessMode: z.string().min(1).max(32),
  limit: z.number().int().nonnegative().nullable(),
  window: z.string().max(32).nullable(),
});

// null means unlimited, 0 means disabled. Both are valid; neither is coerced.
const quotaSchema = z.number().int().nonnegative().nullable();

const featureGatesSchema = z.object({
  allowCompareMode: z.boolean(),
  allowJudgeMode: z.boolean(),
  allowResearchMode: z.boolean(),
  allowCriticReview: z.boolean(),
  allowWorkspaces: z.boolean(),
  allowMemory: z.boolean(),
  allowContextPacks: z.boolean(),
  allowConsensusMode: z.boolean(),
  allowEscalationChain: z.boolean(),
  allowRepairLab: z.boolean(),
  allowTaskDecomposer: z.boolean(),
  allowBestOfN: z.boolean(),
  allowVerifier: z.boolean(),
  allowPipelineLab: z.boolean(),
  allowCostEnsemble: z.boolean(),
  allowRolePack: z.boolean(),
});

const catalogEntrySchema = z.object({
  id: z.string().min(1).max(64),
  slug: z.string().min(1).max(64),
  name: z.string().min(1).max(128),
  description: z.string().max(1024).nullable(),
  displayOrder: z.number().int(),
  isDefault: z.boolean(),
  dailyTokenQuota: quotaSchema,
  weeklyTokenQuota: quotaSchema,
  monthlyTokenQuota: quotaSchema,
  maxChatsPerDay: quotaSchema,
  maxMessagesPerDay: quotaSchema,
  maxWorkspaceConnections: quotaSchema,
  maxContextPacks: quotaSchema,
  maxMemoryItems: quotaSchema,
  featureGates: featureGatesSchema,
  prices: z.array(priceVersionSchema).max(16),
  features: z.array(featureRuleSchema).max(64),
});

export const planCatalogResponseSchema = z.array(catalogEntrySchema).max(64);
export const planPriceVersionResponseSchema = priceVersionSchema.nullable();

/**
 * A purchasable credit package, as auth returns it.
 *
 * `priceMinor` and `creditMicroUsd` are validated as independent NON-NEGATIVE
 * INTEGERS. They are not a ratio this service is allowed to reconstruct: the
 * gap between them IS the platform's margin on a top-up, and it lives in one
 * database row so an operator can change it without a deploy.
 *
 * `creditMicroUsd` is bounded rather than merely non-negative. It is written
 * onto a BIGINT column and then handed to a wallet; an unbounded figure that
 * survived a schema drift would credit money nobody paid for.
 */
const creditPackageSchema = z.object({
  id: z.string().min(1).max(64),
  slug: z.string().min(1).max(64),
  priceMinor: z.number().int().nonnegative(),
  currency: z.string().length(3),
  creditMicroUsd: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
  displayOrder: z.number().int(),
  versionId: z.string().min(1).max(64),
});

export const creditPackageResponseSchema = creditPackageSchema;
export const creditPackageListResponseSchema = z.array(creditPackageSchema).max(64);
