import { z } from 'zod';

export const resendVerificationSchema = z.object({ email: z.string().email() }).strict();
export const verifyEmailSchema = z.object({ token: z.string().min(32).max(256) }).strict();

export type ResendVerificationDto = z.infer<typeof resendVerificationSchema>;
export type VerifyEmailDto = z.infer<typeof verifyEmailSchema>;
