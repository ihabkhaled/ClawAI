import { z } from 'zod';
import { UserLanguagePreference } from '../../../generated/prisma';
import { RegisterValidationIssue } from '../enums/register-validation-issue.enum';

// Self-registration requires email, password, first name, and last name, and
// accepts an optional phone. Role/plan/status are server-assigned; unknown
// client-supplied fields are stripped and the manager hard-codes role=USER.
//
// Every message is a RegisterValidationIssue code, not prose: the 400 body's
// `errors` map is read by the web client and translated per field. The
// password rules repeat `validatePasswordStrength` here so a weak password is
// reported against the `password` field with the exact rule it broke, instead
// of as one opaque WEAK_PASSWORD after the pipe has already passed it.
export const registerSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email(RegisterValidationIssue.EMAIL_INVALID)
    .max(255, RegisterValidationIssue.EMAIL_TOO_LONG),
  password: z
    .string()
    .min(8, RegisterValidationIssue.PASSWORD_TOO_SHORT)
    .max(128, RegisterValidationIssue.PASSWORD_TOO_LONG)
    .regex(/[A-Z]/, RegisterValidationIssue.PASSWORD_NEEDS_UPPERCASE)
    .regex(/[a-z]/, RegisterValidationIssue.PASSWORD_NEEDS_LOWERCASE)
    .regex(/\d/, RegisterValidationIssue.PASSWORD_NEEDS_NUMBER),
  firstName: z
    .string()
    .trim()
    .min(1, RegisterValidationIssue.FIRST_NAME_REQUIRED)
    .max(64, RegisterValidationIssue.FIRST_NAME_TOO_LONG),
  lastName: z
    .string()
    .trim()
    .min(1, RegisterValidationIssue.LAST_NAME_REQUIRED)
    .max(64, RegisterValidationIssue.LAST_NAME_TOO_LONG),
  phone: z
    .string()
    .trim()
    .regex(/^\+[1-9]\d{6,14}$/, RegisterValidationIssue.PHONE_INVALID)
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
