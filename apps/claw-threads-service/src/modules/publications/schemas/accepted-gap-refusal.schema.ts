import { z } from 'zod';

/** The code the generation service returns when a retry accepts a gap its failed review never raised. */
export const ACCEPTED_GAP_REFUSAL_CODE = 'ACCEPTED_GAP_NOT_A_BLOCKER';

export const acceptedGapRefusalSchema = z.object({
  code: z.literal(ACCEPTED_GAP_REFUSAL_CODE),
  message: z.string().min(1).max(1000),
});
