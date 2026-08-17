import { z } from 'zod';

export const registerSchema = z
  .object({
    firstName: z.string().trim().min(1, 'First name is required').max(64, 'First name is too long'),
    lastName: z.string().trim().min(1, 'Last name is required').max(64, 'Last name is too long'),
    email: z.string().email('Please enter a valid email address'),
    phone: z
      .union([
        z.literal(''),
        z
          .string()
          .trim()
          .regex(/^\+[1-9]\d{6,14}$/, 'Phone must be in E.164 format'),
      ])
      .transform((value) => value || undefined)
      .optional(),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .max(128, 'Password is too long')
      .regex(/[A-Z]/, 'Password must contain an uppercase letter')
      .regex(/[a-z]/, 'Password must contain a lowercase letter')
      .regex(/\d/, 'Password must contain a number'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export type RegisterFormValues = z.infer<typeof registerSchema>;
