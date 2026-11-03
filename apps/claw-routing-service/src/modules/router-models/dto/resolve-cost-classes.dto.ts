import { z } from 'zod';
import { COST_CLASS_LOOKUP_MAX_MODELS } from '../constants/model-cost-catalog.constants';

export const resolveCostClassesSchema = z.object({
  models: z
    .array(
      z.object({
        provider: z.string().trim().min(1).max(100),
        model: z.string().trim().min(1).max(255),
      }),
    )
    .min(1)
    .max(COST_CLASS_LOOKUP_MAX_MODELS),
  // The free plan's price limit (ADR-162), micro-USD per million output tokens. Present = each
  // answer also says whether the model is above it. Absent or null = no limit, nothing added.
  freeModelPriceCap: z.number().int().nonnegative().nullable().optional(),
});

export type ResolveCostClassesDto = z.infer<typeof resolveCostClassesSchema>;
