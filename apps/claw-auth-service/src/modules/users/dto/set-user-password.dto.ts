import { z } from 'zod';

/**
 * MANUAL: the administrator types the password (checked against the platform
 * policy by the service). GENERATE: the server creates a strong one and returns
 * it once. The password is never part of any response except GENERATE's.
 */
export const setUserPasswordSchema = z.discriminatedUnion('mode', [
  z.object({ mode: z.literal('MANUAL'), password: z.string().min(1).max(128) }),
  z.object({ mode: z.literal('GENERATE') }),
]);

export type SetUserPasswordDto = z.infer<typeof setUserPasswordSchema>;
