import { z } from 'zod';
import { BillingModel, RouterChainEntryRole, RouterProvider } from '../../../generated/prisma';

/** One entry inside the declarative entries-replace PATCH. The endpoint takes
 * the full desired chain every time — no `id` field, no partial patch — so a
 * single PATCH covers add (append to the array), remove (omit from the
 * array), and reorder (change array order) at once. Array position becomes
 * `order`, the schema's one ordering column. */
const chainEntryInputSchema = z
  .object({
    role: z.nativeEnum(RouterChainEntryRole).default(RouterChainEntryRole.PROVIDER_FALLBACK),
    provider: z.nativeEnum(RouterProvider),
    modelAlias: z.string().min(1).max(200),
    deploymentId: z.string().min(1).max(64).optional(),
    enabled: z.boolean().default(true),
    attemptTimeoutMs: z.number().int().min(100).max(600_000).default(1600),
    retries: z.number().int().min(0).max(10).default(0),
    triggers: z.array(z.string().min(1).max(100)).max(20).default([]),
    skipWhenProviderCircuitOpen: z.boolean().default(true),
    minConfidence: z.number().min(0).max(1).optional(),
    // Integer micro-USD, never a float — mirrors the schema column exactly.
    maxCostMicroUsd: z.number().int().min(0).max(1_000_000_000_000).optional(),
    billingModel: z.nativeEnum(BillingModel).default(BillingModel.UNKNOWN),
  })
  .strict();

export const updateChainEntriesSchema = z
  .object({
    entries: z.array(chainEntryInputSchema).max(50),
  })
  .strict();

export type UpdateChainEntriesDto = z.infer<typeof updateChainEntriesSchema>;
export type ChainEntryInputDto = z.infer<typeof chainEntryInputSchema>;
