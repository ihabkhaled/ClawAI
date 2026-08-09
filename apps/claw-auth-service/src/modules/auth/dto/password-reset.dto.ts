import { z } from 'zod';

export const requestPasswordResetSchema = z
  .object({
    email: z.string().email().max(254),
  })
  .strict();

export type RequestPasswordResetDto = z.infer<typeof requestPasswordResetSchema>;

export const confirmPasswordResetSchema = z
  .object({
    token: z.string().min(1).max(512),
    password: z.string().min(1).max(1024),
  })
  .strict();

export type ConfirmPasswordResetDto = z.infer<typeof confirmPasswordResetSchema>;
