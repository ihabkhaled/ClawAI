import { z } from 'zod';

// Mirrors the admin API: a blank name clears the stored value, so names stay
// strings here and are converted to null at the edge rather than rejected.
const optionalName = z.string().trim().max(64);

export const adminUserEditSchema = z.object({
  username: z
    .string()
    .trim()
    .min(3)
    .max(32)
    .regex(/^[a-zA-Z0-9_-]+$/),
  firstName: optionalName,
  lastName: optionalName,
});

export type AdminUserEditFormValues = z.infer<typeof adminUserEditSchema>;
