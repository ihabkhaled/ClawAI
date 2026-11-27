import { z } from 'zod';

/**
 * The fields of a provider's siteverify answer that decide the outcome. Loose on
 * purpose (`hostname`, `challenge_ts`, `error-codes`... are ignored): a provider
 * adding a field must not turn every sign-up into "unreachable".
 */
export const turnstileVerifyResponseSchema = z.object({
  success: z.boolean(),
});

export const recaptchaVerifyResponseSchema = z.object({
  success: z.boolean(),
  score: z.number().optional(),
  action: z.string().max(256).optional(),
});
