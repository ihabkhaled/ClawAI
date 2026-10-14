import { z } from 'zod';

/** The most ids one lookup may carry. threads-service batches a page of comments into one call. */
export const PUBLIC_PROFILES_MAX_IDS = 100;

export const publicProfilesBodySchema = z
  .object({
    ids: z.array(z.string().min(1).max(64)).max(PUBLIC_PROFILES_MAX_IDS),
  })
  .strict();
export type PublicProfilesBodyDto = z.infer<typeof publicProfilesBodySchema>;

/** A username as the register form allows it (3-32 of letters, digits, `_`, `-`). */
export const publicProfileUsernameSchema = z
  .string()
  .min(1)
  .max(32)
  .regex(/^[A-Za-z0-9_-]+$/u);
