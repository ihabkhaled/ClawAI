import { z } from 'zod';

import { PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from '@/constants/password-generator.constants';
import { UserRole } from '@/enums';

/**
 * Mirrors `createUserSchema` in claw-auth-service exactly, symbol requirement
 * included.
 *
 * The signup form's schema is deliberately not reused: it is looser (no symbol),
 * so a password that passed it would be refused by this endpoint — the form
 * would look broken while behaving correctly.
 */
export const adminCreateUserSchema = z.object({
  email: z.string().trim().email().max(255),
  username: z
    .string()
    .trim()
    .min(3)
    .max(32)
    .regex(/^[a-zA-Z0-9_-]+$/),
  firstName: z.string().trim().max(64),
  lastName: z.string().trim().max(64),
  password: z
    .string()
    .min(PASSWORD_MIN_LENGTH)
    .max(PASSWORD_MAX_LENGTH)
    .regex(/[A-Z]/)
    .regex(/[a-z]/)
    .regex(/\d/)
    .regex(/[^A-Za-z0-9]/),
  role: z.nativeEnum(UserRole),
});

export type AdminCreateUserFormValues = z.infer<typeof adminCreateUserSchema>;
