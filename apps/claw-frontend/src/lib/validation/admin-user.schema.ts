import { z } from 'zod';

import { ADMIN_PHONE_PATTERN } from '@/constants/admin-user-management.constants';

// Mirrors the admin API: a blank name clears the stored value, so names stay
// strings here and are converted to null at the edge rather than rejected.
const optionalName = z.string().trim().max(64);

// A blank phone clears it; anything else must be international format. Same rule as the API.
const optionalPhone = z
  .string()
  .trim()
  .refine((value) => value === '' || ADMIN_PHONE_PATTERN.test(value));

export const adminUserEditSchema = z.object({
  username: z
    .string()
    .trim()
    .min(3)
    .max(32)
    .regex(/^[a-zA-Z0-9_-]+$/),
  firstName: optionalName,
  lastName: optionalName,
  phone: optionalPhone,
});

export type AdminUserEditFormValues = z.infer<typeof adminUserEditSchema>;
