import { z } from 'zod';
import { UserLanguagePreference } from '../../../generated/prisma';

// Self-registration requires email, password, first name, and last name, and
// accepts an optional phone. Role/plan/status are server-assigned; unknown
// client-supplied fields are stripped and the manager hard-codes role=USER.
export const registerSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(255),
  password: z.string().min(8).max(128),
  firstName: z.string().trim().min(1).max(64),
  lastName: z.string().trim().min(1).max(64),
  phone: z
    .string()
    .trim()
    .regex(/^\+[1-9]\d{6,14}$/, 'Phone must be in E.164 format')
    .optional(),
  // The language the user was actually reading when they signed up. Without
  // it the very first email we ever send them — the one that decides whether
  // they can log in at all — would always be English, because the stored
  // preference defaults to EN and there is no session yet to read a real one
  // from. Optional so an older client keeps working; the column default
  // covers it.
  languagePreference: z.nativeEnum(UserLanguagePreference).optional(),
});

export type RegisterDto = z.infer<typeof registerSchema>;
