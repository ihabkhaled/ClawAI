import { z } from 'zod';

import { PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from '@/constants/password-generator.constants';

/** Mirrors the platform password policy the API applies to an administrator-set password. */
export const adminUserPasswordSchema = z.object({
  password: z
    .string()
    .min(PASSWORD_MIN_LENGTH)
    .max(PASSWORD_MAX_LENGTH)
    .regex(/[A-Z]/)
    .regex(/[a-z]/)
    .regex(/\d/),
});

export type AdminUserPasswordFormValues = z.infer<typeof adminUserPasswordSchema>;
