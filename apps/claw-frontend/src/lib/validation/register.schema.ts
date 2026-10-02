import { z } from 'zod';

// Every message is an i18n KEY, rendered through t() by the register form, so
// a format problem is explained in the reader's language before anything is
// sent. The rules match the auth-service register DTO exactly, so a form this
// schema accepts is one the API will accept too.
export const registerSchema = z
  .object({
    firstName: z
      .string()
      .trim()
      .min(1, 'auth.signup.firstNameRequired')
      .max(64, 'auth.signup.firstNameTooLong'),
    lastName: z
      .string()
      .trim()
      .min(1, 'auth.signup.lastNameRequired')
      .max(64, 'auth.signup.lastNameTooLong'),
    email: z
      .string()
      .trim()
      .min(1, 'auth.signup.emailRequired')
      .email('auth.signup.emailInvalid')
      .max(255, 'auth.signup.emailTooLong'),
    phone: z
      .union([
        z.literal(''),
        z
          .string()
          .trim()
          .regex(/^\+[1-9]\d{6,14}$/, 'auth.signup.phoneInvalid'),
      ])
      .transform((value) => value || undefined)
      .optional(),
    password: z
      .string()
      .min(8, 'auth.signup.passwordTooShort')
      .max(128, 'auth.signup.passwordTooLong')
      .regex(/[A-Z]/, 'auth.signup.passwordNeedsUppercase')
      .regex(/[a-z]/, 'auth.signup.passwordNeedsLowercase')
      .regex(/\d/, 'auth.signup.passwordNeedsNumber'),
    confirmPassword: z.string().min(1, 'auth.signup.confirmPasswordRequired'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'auth.signup.passwordsDoNotMatch',
    path: ['confirmPassword'],
  });

export type RegisterFormValues = z.infer<typeof registerSchema>;
