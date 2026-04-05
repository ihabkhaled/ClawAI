import { z } from "zod";

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1).max(128),
  newPassword: z.string().min(8).max(128),
});

export type ChangePasswordDto = z.infer<typeof changePasswordSchema>;
