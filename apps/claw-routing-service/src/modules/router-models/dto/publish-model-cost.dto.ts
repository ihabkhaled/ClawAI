import { z } from 'zod';
import { CostClass, LocalComputeOwnership } from '../../../generated/prisma';

// A per-million micro-USD rate. Bounded so a fat-fingered admin entry cannot
// price a model at a level that overflows downstream arithmetic — the ceiling
// is $1,000 per million tokens, far above any real frontier model.
const rateSchema = z.coerce.number().int().min(0).max(1_000_000_000).nullable();

export const publishModelCostSchema = z
  .object({
    provider: z.string().min(1).max(64),
    modelKey: z.string().min(1).max(200),
    currency: z.string().length(3).default('USD'),
    inputPerMillionMicroUsd: rateSchema.default(null),
    outputPerMillionMicroUsd: rateSchema.default(null),
    cachedInputPerMillionMicroUsd: rateSchema.default(null),
    cacheWritePerMillionMicroUsd: rateSchema.default(null),
    reasoningPerMillionMicroUsd: rateSchema.default(null),
    imagePerUnitMicroUsd: rateSchema.default(null),
    audioPerUnitMicroUsd: rateSchema.default(null),
    videoPerUnitMicroUsd: rateSchema.default(null),
    toolCallPerUnitMicroUsd: rateSchema.default(null),
    searchCallPerUnitMicroUsd: rateSchema.default(null),
    costClass: z.nativeEnum(CostClass).default(CostClass.STANDARD),
    localComputeOwnership: z.nativeEnum(LocalComputeOwnership).nullable().default(null),
    notes: z.string().max(1000).nullable().default(null),
  })
  // A price with only one side is not a price: cost cannot be bounded from
  // input alone, and a half-priced model would look cheap and bill wrong.
  .refine(
    (value) =>
      (value.inputPerMillionMicroUsd === null) === (value.outputPerMillionMicroUsd === null),
    { message: 'input and output rates must be supplied together' },
  );

export type PublishModelCostDto = z.infer<typeof publishModelCostSchema>;

export const estimateModelCostSchema = z.object({
  provider: z.string().min(1).max(64),
  modelKey: z.string().min(1).max(200),
  promptTokens: z.coerce.number().int().min(0).max(10_000_000),
  maxOutputTokens: z.coerce.number().int().min(0).max(10_000_000),
});

export type EstimateModelCostDto = z.infer<typeof estimateModelCostSchema>;

export const priceModelCostSchema = z.object({
  provider: z.string().min(1).max(64),
  modelKey: z.string().min(1).max(200),
  inputTokens: z.coerce.number().int().min(0).max(100_000_000).default(0),
  cachedInputTokens: z.coerce.number().int().min(0).max(100_000_000).default(0),
  reasoningTokens: z.coerce.number().int().min(0).max(100_000_000).default(0),
  outputTokens: z.coerce.number().int().min(0).max(100_000_000).default(0),
  toolCalls: z.coerce.number().int().min(0).max(100_000).default(0),
  searchCalls: z.coerce.number().int().min(0).max(100_000).default(0),
  // Images produced. Priced per unit rather than per token — an image endpoint
  // reports no token usage at all, so this is the only signal that the call cost
  // anything. Defaults to 0 so every existing text-only caller is unchanged.
  imageUnits: z.coerce.number().int().min(0).max(1_000).default(0),
});

export type PriceModelCostDto = z.infer<typeof priceModelCostSchema>;
