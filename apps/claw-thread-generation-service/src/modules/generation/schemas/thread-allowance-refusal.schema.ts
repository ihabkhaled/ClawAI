import { z } from 'zod';

/** The code auth-service puts on the 403 that says a plan feature a Thread needs is used up or held. */
export const THREAD_ALLOWANCE_UNAVAILABLE_CODE = 'THREAD_ALLOWANCE_UNAVAILABLE';

/** The refusal reason for a plan that switches the feature off (no numbers to show). */
export const THREAD_FEATURE_DISABLED_REASON = 'FEATURE_DISABLED';

/**
 * The body of that 403. Only an allowance that exists but is used up or held carries the numbers
 * the owner needs (`used` of `limit`, and when the `window` renews); a feature the plan switches
 * off stays the plain "not permitted" refusal.
 */
export const threadAllowanceRefusalSchema = z.object({
  code: z.literal(THREAD_ALLOWANCE_UNAVAILABLE_CODE),
  message: z.string().min(1).max(1000),
  feature: z.string().min(1).max(64),
  reason: z.string().min(1).max(64),
  used: z.number().int().nonnegative().safe(),
  limit: z.number().int().nonnegative().safe(),
  window: z.string().max(64).nullable().optional(),
});
