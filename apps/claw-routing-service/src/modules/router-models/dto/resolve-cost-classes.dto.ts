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
});

export type ResolveCostClassesDto = z.infer<typeof resolveCostClassesSchema>;
