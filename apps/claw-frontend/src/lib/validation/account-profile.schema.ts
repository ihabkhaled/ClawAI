import { z } from 'zod';

export const accountProfileSchema = z.object({
  username: z
    .string()
    .min(3)
    .max(32)
    .regex(/^[a-zA-Z0-9_-]+$/),
  currentPassword: z.string().min(1).max(256),
});

export const deleteAccountSchema = z.object({
  currentPassword: z.string().min(1).max(256),
});

export type AccountProfileFormValues = z.infer<typeof accountProfileSchema>;
export type DeleteAccountFormValues = z.infer<typeof deleteAccountSchema>;
