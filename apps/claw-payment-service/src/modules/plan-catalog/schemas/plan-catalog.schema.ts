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
  prices: z.array(priceVersionSchema).max(16),
  features: z.array(featureRuleSchema).max(64),
});

export const planCatalogResponseSchema = z.array(catalogEntrySchema).max(64);
export const planPriceVersionResponseSchema = priceVersionSchema.nullable();
