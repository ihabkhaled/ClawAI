import { z } from 'zod';

export const requestEmailChangeSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newEmail: z
    .string()
    .trim()
    .email('Please enter a valid email address')
    .max(255, 'Email must be at most 255 characters'),
});

export const confirmOtpSchema = z.object({
  otp: z.string().regex(/^\d{6}$/, 'OTP must be exactly 6 digits'),
});

export type RequestEmailChangeFormValues = z.infer<typeof requestEmailChangeSchema>;
export type ConfirmOtpFormValues = z.infer<typeof confirmOtpSchema>;
