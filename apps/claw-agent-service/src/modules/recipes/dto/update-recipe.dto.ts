import { z } from 'zod';

import { recipeDslSchema } from './recipe-dsl.dto';

/**
 * Stream 13 — partial-update an existing recipe. Same constraints as
 * create-recipe but every field is optional. `dsl` updates bump the
 * stored `version` integer atomically in the repository.
 */
export const updateRecipeSchema = z
  .object({
    name: z.string().min(1).max(120),
    description: z.string().max(2000),
    dsl: recipeDslSchema,
    isEnabled: z.boolean(),
    metadata: z.record(z.string(), z.unknown()),
  })
  .partial();

export type UpdateRecipeDto = z.infer<typeof updateRecipeSchema>;
