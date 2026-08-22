import { z } from 'zod';

export const requestEmailChangeSchema = z
  .object({
    currentPassword: z.string().min(1).max(256),
    newEmail: z.string().email().max(255),
  })
  .strict();

export const confirmOldEmailOtpSchema = z
  .object({
    requestId: z.string().min(1).max(64),
    otp: z.string().regex(/^\d{6}$/),
  })
  .strict();

export const resendEmailChangeOtpSchema = z
  .object({
    requestId: z.string().min(1).max(64),
  })
  .strict();

export const cancelEmailChangeSchema = z
  .object({
    requestId: z.string().min(1).max(64),
  })
  .strict();

export const confirmEmailChangeSchema = z
  .object({
    token: z.string().min(32).max(256),
  })
  .strict();

export type RequestEmailChangeDto = z.infer<typeof requestEmailChangeSchema>;
export type ConfirmOldEmailOtpDto = z.infer<typeof confirmOldEmailOtpSchema>;
export type ResendEmailChangeOtpDto = z.infer<typeof resendEmailChangeOtpSchema>;
export type CancelEmailChangeDto = z.infer<typeof cancelEmailChangeSchema>;
export type ConfirmEmailChangeDto = z.infer<typeof confirmEmailChangeSchema>;
