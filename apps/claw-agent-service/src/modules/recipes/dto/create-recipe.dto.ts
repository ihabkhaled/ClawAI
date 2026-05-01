import { z } from 'zod';

import { recipeDslSchema } from './recipe-dsl.dto';

/**
 * Stream 13 — create or upsert a recipe owned by the calling user.
 *
 * `dsl` is validated against the full recipe-DSL Zod schema; the
 * resulting JSON is stored verbatim in `Recipe.dsl`. Runner not yet
 * shipped — this PR delivers CRUD only so the frontend library page
 * can land in parallel.
 */
export const createRecipeSchema = z.object({
  name: z.string().min(1).max(120),
  description: z.string().max(2000).optional(),
  dsl: recipeDslSchema,
  isEnabled: z.boolean().default(true),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export type CreateRecipeDto = z.infer<typeof createRecipeSchema>;
