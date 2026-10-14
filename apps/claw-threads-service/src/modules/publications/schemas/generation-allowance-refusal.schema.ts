import { z } from 'zod';

/** The code the generation service forwards from the budget service for a used-up or held allowance. */
export const GENERATION_ALLOWANCE_REFUSAL_CODE = 'THREAD_ALLOWANCE_UNAVAILABLE';

/** What the generation service forwards: how much of which allowance is used, and when it renews. */
export const generationAllowanceRefusalSchema = z.object({
  code: z.literal(GENERATION_ALLOWANCE_REFUSAL_CODE),
  message: z.string().min(1).max(1000),
  feature: z.string().min(1).max(64),
  used: z.number().int().nonnegative().safe(),
  limit: z.number().int().nonnegative().safe(),
  window: z.string().max(64).nullable().optional(),
});
