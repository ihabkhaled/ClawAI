import { z } from 'zod';

/**
 * `routing.model_cost.published`.
 *
 * Only the two fields the cache is keyed by are required. Accepting a wider
 * payload than it uses is deliberate: routing-service owns this event and will
 * add fields to it, and an over-strict schema here would turn a harmless
 * addition into a silently dropped cache invalidation — which shows up months
 * later as a mis-billed model nobody can explain.
 *
 * `model` accepts the two names the platform uses for the same thing:
 * routing-service's registry calls it `modelKey`, while the cost API returns it
 * as `model`.
 */
export const modelCostPublishedEventSchema = z
  .object({
    provider: z.string().min(1).max(64),
    model: z.string().min(1).max(256).optional(),
    modelKey: z.string().min(1).max(256).optional(),
  })
  .transform((value) => ({ provider: value.provider, model: value.model ?? value.modelKey ?? '' }))
  .refine((value) => value.model.length > 0, {
    message: 'model or modelKey is required',
  });
