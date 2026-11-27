import { z } from 'zod';

import { POW_DIFFICULTY_MAX, POW_SALT_PATTERN } from '../constants/anti-abuse.constants';

/**
 * The payload of a proof-of-work challenge token, parsed AFTER its HMAC verified.
 * Parsed rather than cast: a token signed by an older build with another shape
 * must be refused, not half-read.
 */
export const powChallengePayloadSchema = z
  .object({
    v: z.number().int(),
    salt: z.string().max(64).regex(POW_SALT_PATTERN),
    difficulty: z.number().int().min(1).max(POW_DIFFICULTY_MAX),
    exp: z.number().int().positive(),
  })
  .strict();
