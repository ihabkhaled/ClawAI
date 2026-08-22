import { z } from 'zod';

const currentPasswordSchema = z.string().min(1).max(256);
const usernameSchema = z
  .string()
  .min(3)
  .max(32)
  .regex(/^[a-zA-Z0-9_-]+$/);

export const updateOwnProfileSchema = z
  .object({
    currentPassword: currentPasswordSchema,
    username: usernameSchema.optional(),
  })
  .refine((value) => value.username !== undefined, {
    message: 'At least one profile field is required',
  });

export const deleteOwnAccountSchema = z.object({
  currentPassword: currentPasswordSchema,
});

export type UpdateOwnProfileDto = z.infer<typeof updateOwnProfileSchema>;
export type DeleteOwnAccountDto = z.infer<typeof deleteOwnAccountSchema>;
